import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";
import { PublicKey } from "@solana/web3.js";

describe("Merchant Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let stateAccount: anchor.web3.Keypair;
  let dao: anchor.web3.Keypair;
  let user: anchor.web3.Keypair;
  let userPda: anchor.web3.PublicKey;
  let referrer: anchor.web3.Keypair;
  let referrerPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    referrer = anchor.web3.Keypair.generate();
    stateAccount = anchor.web3.Keypair.generate();
    dao = anchor.web3.Keypair.generate();

    await fundAccount(provider.connection, user);
    await fundAccount(provider.connection, referrer);
    await fundAccount(provider.connection, stateAccount);

    [userPda] = await calculatePDA(program.programId, user, "user");
    [referrerPda] = await calculatePDA(program.programId, referrer, "user");

    await initializeState(program, stateAccount, user, dao.publicKey);
    await initializeNewUser();
  });

  async function initializeNewUser() {
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: userPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  it("Initializes a new merchant", async () => {
    const merchant = anchor.web3.Keypair.generate();
    let merchantPda: anchor.web3.PublicKey;

    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

    await fundAccount(provider.connection, merchant);

    const nftIdentifier = {
      merkle_tree_address: new anchor.web3.PublicKey(
        "BPFLoaderUpgradeab1e11111111111111111111111"
      ),
      leaf_index: 123,
    };

    await program.methods
      .initializeMerchant({
        merkleTreeAddress: nftIdentifier.merkle_tree_address,
        leafIndex: nftIdentifier.leaf_index,
      })
      .accounts({
        merchant: merchantPda,
        userAccount: userPda,
        user: user.publicKey,
        state: stateAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch and verify the initialized merchant account
    const merchantAccount = await program.account.merchant.fetch(merchantPda);
    assert.isTrue(
      merchantAccount.isInitialized,
      "Merchant should be initialized"
    );
    assert.strictEqual(
      merchantAccount.nftIdentifier.merkleTreeAddress.toString(),
      nftIdentifier.merkle_tree_address.toString(),
      "NFT identifier's Merkle tree address should match"
    );
    assert.strictEqual(
      merchantAccount.nftIdentifier.leafIndex,
      nftIdentifier.leaf_index,
      "NFT identifier's leaf index should match"
    );
  });

  // Additional tests can be added here
});
