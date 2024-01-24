import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";

describe.only("Review Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let stateAccount: anchor.web3.Keypair;
  let daoWallet: anchor.web3.Keypair;
  let reviewWallet: anchor.web3.Keypair;
  let user: anchor.web3.Keypair;
  let userPda: anchor.web3.PublicKey;
  let merchantPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    stateAccount = anchor.web3.Keypair.generate();
    daoWallet = anchor.web3.Keypair.generate();
    reviewWallet = anchor.web3.Keypair.generate();

    await fundAccount(provider.connection, user);
    await fundAccount(provider.connection, stateAccount);
    await fundAccount(provider.connection, reviewWallet);

    [userPda] = await calculatePDA(program.programId, user, "user");

    await initializeState(
      program,
      stateAccount,
      user,
      daoWallet.publicKey,
      reviewWallet.publicKey
    );

    await initializeNewUser();
    await initializeMerchant();
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

  async function initializeMerchant() {
    // Proceed with merchant initialization
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

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
        merchantAccount: merchantPda,
        userAccount: userPda,
        user: user.publicKey,
        state: stateAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  it("Add review for Merchant with ReviewWallet", async () => {
    const review = 4;

    try {
      await program.methods
        .addRating(review)
        .accounts({
          merchant: merchantPda,
          state: stateAccount.publicKey,
          signer: reviewWallet.publicKey,
        })
        .signers([reviewWallet])
        .rpc();
    } catch (error) {
      console.error("Error when adding rating:", error);
      throw error;
    }

    // Fetch and verify the added rate
    const merchantAccount = await program.account.merchant.fetch(merchantPda);
    console.log(merchantAccount.ratings[0]);
  });

  it("Should reject adding a review with an invalid rating", async () => {
    const invalidRating = 6; // Rating outside the valid range (1-5)

    try {
      await program.methods
        .addRating(invalidRating)
        .accounts({
          merchant: merchantPda,
          state: stateAccount.publicKey,
          signer: reviewWallet.publicKey,
        })
        .signers([reviewWallet])
        .rpc();
      throw new Error("Test should have thrown an error for invalid rating");
    } catch (error) {
      // Check if the error is the expected `InvalidRating` error
      assert.include(
        error.toString(),
        "0x5",
        "Expected an InvalidRating error (0x5)"
      );
    }
  });

  it("Should reject adding a review with an unauthorized signer", async () => {
    const review = 4;
    const unauthorizedSigner = anchor.web3.Keypair.generate(); // Generate a random keypair

    try {
      await program.methods
        .addRating(review)
        .accounts({
          merchant: merchantPda,
          state: stateAccount.publicKey,
          signer: unauthorizedSigner.publicKey, // Using unauthorized signer
        })
        .signers([unauthorizedSigner])
        .rpc();
      throw new Error(
        "Test should have thrown an error for unauthorized signer"
      );
    } catch (error) {
      // Check if the error is the expected `Unauthorized` error
      assert.include(
        error.toString(),
        "0x7",
        "Expected an Unauthorized error (0x7)"
      );
    }
  });
});
