import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";
import { createMint } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

describe("Review Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  // Service wallets
  let stateAccount: anchor.web3.Keypair,
    daoWallet: anchor.web3.Keypair,
    onboardingServiceWallet: anchor.web3.Keypair,
    merchantIdServiceWallet: anchor.web3.Keypair,
    transactionServiceWallet: anchor.web3.Keypair,
    reviewServiceWallet: anchor.web3.Keypair,
    user: anchor.web3.Keypair,
    user2: anchor.web3.Keypair;

  let mintUSDC: anchor.web3.PublicKey;
  let userPda: anchor.web3.PublicKey;
  let merchantPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    stateAccount = anchor.web3.Keypair.generate();
    daoWallet = anchor.web3.Keypair.generate();
    onboardingServiceWallet = anchor.web3.Keypair.generate();
    merchantIdServiceWallet = anchor.web3.Keypair.generate();
    transactionServiceWallet = anchor.web3.Keypair.generate();
    reviewServiceWallet = anchor.web3.Keypair.generate();

    await fundAccount(provider.connection, user);
    await fundAccount(provider.connection, stateAccount);
    await fundAccount(provider.connection, daoWallet);
    await fundAccount(provider.connection, onboardingServiceWallet);
    await fundAccount(provider.connection, merchantIdServiceWallet);
    await fundAccount(provider.connection, transactionServiceWallet);
    await fundAccount(provider.connection, reviewServiceWallet);

    [userPda] = await calculatePDA(program.programId, user, "user");

    mintUSDC = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );
    const transactionFee = 30;

    // Fund keypairs
    await Promise.all(
      [
        stateAccount,
        daoWallet,
        onboardingServiceWallet,
        merchantIdServiceWallet,
        transactionServiceWallet,
        reviewServiceWallet,
      ].map((kp) => fundAccount(provider.connection, kp))
    );

    await initializeState(
      program,
      stateAccount,
      user,
      mintUSDC,
      transactionFee,
      daoWallet.publicKey,
      onboardingServiceWallet.publicKey,
      merchantIdServiceWallet.publicKey,
      transactionServiceWallet.publicKey,
      reviewServiceWallet.publicKey
    );

    [userPda] = await calculatePDA(program.programId, user, "user");
    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

    await initializeNewUser(userPda, user);
    await initializeMerchant(merchantPda, user);
  });

  async function initializeNewUser(
    userPda: PublicKey,
    user: anchor.web3.Keypair
  ) {
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: userPda,
        userPubkey: user.publicKey,
        state: stateAccount.publicKey,
        serviceWallet: onboardingServiceWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([onboardingServiceWallet])
      .rpc();
  }

  const nftIdentifier = {
    merkle_tree_address: new anchor.web3.PublicKey(
      "BPFLoaderUpgradeab1e11111111111111111111111"
    ),
    leaf_index: 123,
  };

  async function initializeMerchant(
    merchantPda: PublicKey,
    user: anchor.web3.Keypair
  ) {
    await program.methods
      .initializeMerchant({
        merkleTreeAddress: nftIdentifier.merkle_tree_address,
        leafIndex: nftIdentifier.leaf_index,
      })
      .accounts({
        merchantAccount: merchantPda,
        userAccount: userPda,
        userPubkey: user.publicKey,
        serviceWallet: merchantIdServiceWallet.publicKey,
        state: stateAccount.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchantIdServiceWallet])
      .rpc();
  }

  it("Add review for Merchant with ReviewWallet and reward with EXP reviewer", async () => {
    const review = 4;

    // Fetch the reviewer's initial EXP points
    const reviewerInitialExp = (await program.account.user.fetch(userPda))
      .expPoints;

    try {
      await program.methods
        .addRating(review)
        .accounts({
          merchant: merchantPda,
          state: stateAccount.publicKey,
          signer: reviewServiceWallet.publicKey,
          reviewer: userPda,
        })
        .signers([reviewServiceWallet])
        .rpc();
    } catch (error) {
      console.error("Error when adding rating:", error);
      throw error;
    }

    // Fetch and verify the added rate
    const merchantAccount = await program.account.merchant.fetch(merchantPda);
    console.log(merchantAccount.ratings[0]);

    const reviewerUpdatedExp = (await program.account.user.fetch(userPda))
      .expPoints;

    assert.equal(
      reviewerUpdatedExp,
      reviewerInitialExp + 20,
      "Reviewer should have been awarded 20 EXP points"
    );
  });

  it("Should reject adding a review with an invalid rating", async () => {
    const invalidRating = 6; // Rating outside the valid range (1-5)

    try {
      await program.methods
        .addRating(invalidRating)
        .accounts({
          merchant: merchantPda,
          state: stateAccount.publicKey,
          signer: reviewServiceWallet.publicKey,
          reviewer: userPda,
        })
        .signers([reviewServiceWallet])
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
          reviewer: userPda,
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
        "0x8",
        "Expected an Unauthorized error (0x8)"
      );
    }
  });
});
