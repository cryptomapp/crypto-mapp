import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";

describe.only("Merchant Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let stateAccount: anchor.web3.Keypair;
  let dao: anchor.web3.Keypair;
  let user: anchor.web3.Keypair;
  let userPda: anchor.web3.PublicKey;
  let referrer: anchor.web3.Keypair;
  let referrerPda: anchor.web3.PublicKey;
  let merchantPda: anchor.web3.PublicKey;

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

  async function initializeReferrerAsUser() {
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: referrerPda,
        user: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([referrer])
      .rpc();
  }

  it("Initializes a new merchant", async () => {
    // Initialize the user
    await initializeNewUser();

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

  it("Initializes a new merchant with a referrer", async () => {
    // Initialize the referrer as a user

    await initializeReferrerAsUser();
    [userPda] = await calculatePDA(program.programId, user, "user");

    // Initialize the main user with the referrer
    await program.methods
      .initializeUserWithReferrer()
      .accounts({
        userAccount: userPda,
        user: user.publicKey,
        referrerAccount: referrerPda,
        referrer: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Log the referrer set in the user's account
    const userAccount = await program.account.user.fetch(userPda);
    console.log("UserAccount Referrer:", userAccount.referrer.toBase58());
    console.log("Referrer:", referrer.publicKey.toBase58());

    assert.strictEqual(
      userAccount.referrer.toString(),
      referrer.publicKey.toString(),
      "Referrer's public key should be set correctly in user account"
    );

    // Then, initialize the merchant with the referrer
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

    const nftIdentifier = {
      merkle_tree_address: new anchor.web3.PublicKey(
        "BPFLoaderUpgradeab1e11111111111111111111111"
      ),
      leaf_index: 123,
    };

    try {
      await program.methods
        .initializeMerchantWithReferrer({
          merkleTreeAddress: nftIdentifier.merkle_tree_address,
          leafIndex: nftIdentifier.leaf_index,
        })
        .accounts({
          merchantAccount: merchantPda,
          userAccount: userPda,
          referrer: referrer.publicKey,
          user: user.publicKey,
          referrerAccount: referrerPda,
          state: stateAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      console.error("Error initializing merchant with referrer:", error);
      throw error; // Rethrow to fail the test in case of error
    }

    // Fetch and verify the initialized merchant account
    const merchantAccount = await program.account.merchant.fetch(merchantPda);
    assert.isTrue(
      merchantAccount.isInitialized,
      "Merchant should be initialized"
    );
  });

  it("Should not allow initializing a merchant with an invalid referrer", async () => {
    // Initialize a potential merchant
    await initializeNewUser(); // Assuming this initializes 'user'

    // Initialize a potential invalid referrer
    const invalidReferrer = anchor.web3.Keypair.generate();
    await fundAccount(provider.connection, invalidReferrer);
    const [invalidReferrerPda] = await calculatePDA(
      program.programId,
      invalidReferrer,
      "user"
    );
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: invalidReferrerPda,
        user: invalidReferrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([invalidReferrer])
      .rpc();

    // Attempt to initialize merchant with the invalid referrer
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");
    const nftIdentifier = {
      merkle_tree_address: new anchor.web3.PublicKey(
        "BPFLoaderUpgradeab1e11111111111111111111111"
      ),
      leaf_index: 123,
    };

    try {
      await program.methods
        .initializeMerchantWithReferrer({
          merkleTreeAddress: nftIdentifier.merkle_tree_address,
          leafIndex: nftIdentifier.leaf_index,
        })
        .accounts({
          merchantAccount: merchantPda,
          userAccount: userPda,
          user: user.publicKey,
          referrer: invalidReferrer.publicKey,
          referrerAccount: invalidReferrerPda, // Note: Using the invalid referrer's PDA
          state: stateAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      throw new Error("Test should have failed with InvalidReferrer error");
    } catch (error) {
      console.log(error.toString());
      // Expect the error to be an InvalidReferrer error
      assert.include(
        error.toString(),
        "0x6",
        "Expected an InvalidReferrer error (0x6)"
      );
    }
  });

  // Additional tests can be added here
});