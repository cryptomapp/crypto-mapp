import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";

describe("Merchant Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  const nftIdentifier = {
    merkle_tree_address: new anchor.web3.PublicKey(
      "BPFLoaderUpgradeab1e11111111111111111111111"
    ),
    leaf_index: 123,
  };

  let stateAccount: anchor.web3.Keypair;
  let daoWallet: anchor.web3.Keypair;
  let userWallet: anchor.web3.Keypair;
  let reviewWallet: anchor.web3.Keypair;
  let user: anchor.web3.Keypair;
  let userPda: anchor.web3.PublicKey;
  let referrer: anchor.web3.Keypair;
  let referrerPda: anchor.web3.PublicKey;
  let merchantPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    referrer = anchor.web3.Keypair.generate();
    stateAccount = anchor.web3.Keypair.generate();
    daoWallet = anchor.web3.Keypair.generate();
    userWallet = anchor.web3.Keypair.generate();
    reviewWallet = anchor.web3.Keypair.generate();

    await fundAccount(provider.connection, user);
    await fundAccount(provider.connection, referrer);
    await fundAccount(provider.connection, stateAccount);
    await fundAccount(provider.connection, daoWallet);
    await fundAccount(provider.connection, userWallet);
    await fundAccount(provider.connection, reviewWallet);

    [userPda] = await calculatePDA(program.programId, user, "user");
    [referrerPda] = await calculatePDA(program.programId, referrer, "user");

    await initializeState(
      program,
      stateAccount,
      user,
      daoWallet.publicKey,
      userWallet.publicKey,
      reviewWallet.publicKey
    );
  });

  async function initializeNewUser() {
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: userPda,
        userPubkey: user.publicKey,
        state: stateAccount.publicKey,
        serviceWallet: userWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();
  }

  async function initializeReferrerAsUser() {
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: referrerPda,
        userPubkey: referrer.publicKey,
        state: stateAccount.publicKey,
        serviceWallet: userWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();
  }

  async function initializeMerchant() {
    // Proceed with merchant initialization
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

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

  it("Initializes a new merchant", async () => {
    await initializeNewUser();
    await initializeMerchant();

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
        userPubkey: user.publicKey,
        referrerAccount: referrerPda,
        referrer: referrer.publicKey,
        serviceWallet: userWallet.publicKey,
        state: stateAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();

    // Log the referrer set in the user's account
    const userAccount = await program.account.user.fetch(userPda);

    assert.strictEqual(
      userAccount.referrer.toString(),
      referrer.publicKey.toString(),
      "Referrer's public key should be set correctly in user account"
    );

    // Then, initialize the merchant with the referrer
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

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
    // Initialize the user
    const user2 = anchor.web3.Keypair.generate();
    const [user2Pda] = await calculatePDA(program.programId, user2, "user");
    await fundAccount(provider.connection, user2);

    await program.methods
      .initializeUser()
      .accounts({
        userAccount: user2Pda,
        userPubkey: user2.publicKey,
        serviceWallet: userWallet.publicKey,
        state: stateAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();

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
        userPubkey: invalidReferrer.publicKey,
        serviceWallet: userWallet.publicKey,
        state: stateAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();

    // Attempt to initialize merchant with the invalid referrer
    [merchantPda] = await calculatePDA(program.programId, user2, "merchant");

    try {
      await program.methods
        .initializeMerchantWithReferrer({
          merkleTreeAddress: nftIdentifier.merkle_tree_address,
          leafIndex: nftIdentifier.leaf_index,
        })
        .accounts({
          merchantAccount: merchantPda,
          userAccount: user2Pda,
          user: user2.publicKey,
          referrer: invalidReferrer.publicKey,
          referrerAccount: invalidReferrerPda,
          state: stateAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();
      throw new Error("Test should have failed with InvalidReferrer error");
    } catch (error) {
      // Expect the error to be an InvalidReferrer error
      assert.include(
        error.toString(),
        "0x2",
        "Expected an ReferrerDoesNotExist error (0x2)"
      );
    }
  });

  it("Increments merchant counter after initializing a merchant", async () => {
    // Initialize the user
    await initializeNewUser();

    // Fetch state before initializing the merchant
    let stateBefore = await program.account.programState.fetch(
      stateAccount.publicKey
    );
    const counterBefore = stateBefore.merchantCounter;

    // Initialize the merchant
    await initializeMerchant();

    // Fetch state after initializing the merchant
    let stateAfter = await program.account.programState.fetch(
      stateAccount.publicKey
    );
    const counterAfter = stateAfter.merchantCounter;

    // Verify that the counter has incremented by 1
    assert.strictEqual(
      counterAfter,
      counterBefore + 1,
      "Merchant counter should increment by 1"
    );
  });

  it("Increments merchant counter after initializing a merchant with a referrer", async () => {
    // Initialize the referrer as a user
    await initializeReferrerAsUser();
    [userPda] = await calculatePDA(program.programId, user, "user");

    // Initialize the main user with the referrer
    await program.methods
      .initializeUserWithReferrer()
      .accounts({
        userAccount: userPda,
        userPubkey: user.publicKey,
        referrerAccount: referrerPda,
        referrer: referrer.publicKey,
        serviceWallet: userWallet.publicKey,
        state: stateAccount.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userWallet])
      .rpc();

    // Log the referrer set in the user's account
    const userAccount = await program.account.user.fetch(userPda);

    assert.strictEqual(
      userAccount.referrer.toString(),
      referrer.publicKey.toString(),
      "Referrer's public key should be set correctly in user account"
    );

    // Fetch state before initializing the merchant with referrer
    let stateBefore = await program.account.programState.fetch(
      stateAccount.publicKey
    );
    const counterBefore = stateBefore.merchantCounter;

    // Then, initialize the merchant with the referrer
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

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

    // Fetch state after initializing the merchant with referrer
    let stateAfter = await program.account.programState.fetch(
      stateAccount.publicKey
    );
    const counterAfter = stateAfter.merchantCounter;

    // Verify that the counter has incremented by 1
    assert.strictEqual(
      counterAfter,
      counterBefore + 1,
      "Merchant counter should increment by 1 when initializing with referrer"
    );
  });
});
