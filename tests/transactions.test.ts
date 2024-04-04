import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe.only("Transaction Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let mintUSDC: PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let user2TokenAccount: anchor.web3.PublicKey;
  let daoTokenAccount: anchor.web3.PublicKey;
  let userPda: anchor.web3.PublicKey;
  let senderUserAccount: anchor.web3.PublicKey;
  let user2Pda: anchor.web3.PublicKey;
  let receiverUserAccount: anchor.web3.PublicKey;
  let merchantPda: anchor.web3.PublicKey;

  // Service wallets
  let stateAccount: anchor.web3.Keypair,
    daoWallet: anchor.web3.Keypair,
    onboardingServiceWallet: anchor.web3.Keypair,
    merchantIdServiceWallet: anchor.web3.Keypair,
    transactionServiceWallet: anchor.web3.Keypair,
    reviewServiceWallet: anchor.web3.Keypair,
    user: anchor.web3.Keypair,
    user2: anchor.web3.Keypair;

  // Transaction Fee
  const transactionFee = 30; // 0.3%

  beforeEach(async () => {
    // Generate keypairs for service wallets
    daoWallet = anchor.web3.Keypair.generate();
    onboardingServiceWallet = anchor.web3.Keypair.generate();
    merchantIdServiceWallet = anchor.web3.Keypair.generate();
    transactionServiceWallet = anchor.web3.Keypair.generate();
    reviewServiceWallet = anchor.web3.Keypair.generate();

    // Generate keypairs for users
    user = anchor.web3.Keypair.generate();
    user2 = anchor.web3.Keypair.generate();

    await fundAccount(provider.connection, user);
    await fundAccount(provider.connection, user2);
    await fundAccount(provider.connection, daoWallet);

    stateAccount = anchor.web3.Keypair.generate();

    mintUSDC = await createMint(
      provider.connection,
      user,
      user.publicKey,
      null,
      6
    );

    userTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user,
        mintUSDC,
        user.publicKey
      )
    ).address;

    user2TokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user2,
        mintUSDC,
        user2.publicKey
      )
    ).address;

    daoTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user,
        mintUSDC,
        daoWallet.publicKey
      )
    ).address;

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

    // Calculate PDAs
    [userPda] = await calculatePDA(program.programId, user, "user");
    receiverUserAccount = userPda;

    [user2Pda] = await calculatePDA(program.programId, user2, "user");
    senderUserAccount = user2Pda;

    [merchantPda] = await calculatePDA(program.programId, user, "merchant");

    // Initialize user, referrer as users, and merchant
    await initializeNewUser(userPda, user);
    await initializeNewUser(user2Pda, user2);
    await initializeMerchant(merchantPda, user);

    await mintMockUSDC(
      provider.connection,
      user,
      mintUSDC,
      user.publicKey,
      1000000000
    );

    await mintMockUSDC(
      provider.connection,
      user,
      mintUSDC,
      user2.publicKey,
      1000000000
    );

    await mintMockUSDC(
      provider.connection,
      user,
      mintUSDC,
      daoWallet.publicKey,
      1000000000
    );
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

  async function mintMockUSDC(
    connection: Connection,
    payer: Keypair,
    mintUSDC: PublicKey,
    recipientPublicKey: PublicKey,
    amount: number
  ): Promise<void> {
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintUSDC,
      recipientPublicKey
    );

    await mintTo(
      connection,
      payer,
      mintUSDC,
      recipientTokenAccount.address,
      payer,
      amount,
      []
    );
  }

  async function getTokenAccountBalance(
    connection: Connection,
    tokenAccountAddress: PublicKey
  ): Promise<number> {
    const accountInfo = await connection.getTokenAccountBalance(
      tokenAccountAddress
    );
    return parseInt(accountInfo.value.amount);
  }

  async function createExecuteTransactionInstruction({
    program,
    senderPublicKey,
    senderUsdcAccount,
    receiverUsdcAccount,
    daoUsdcAccount,
    stateAccountPublicKey,
    senderUserAccount,
    receiverUserAccount,
    amount,
  }) {
    return program.methods
      .executeTransaction(new anchor.BN(amount))
      .accounts({
        sender: senderPublicKey,
        senderUsdcAccount,
        receiverUsdcAccount,
        daoUsdcAccount,
        state: stateAccountPublicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        senderUserAccount,
        receiverUserAccount,
      })
      .instruction();
  }

  async function sendTransactionWithServiceWalletAsPayer({
    provider,
    serviceWallet,
    instructions,
    signers,
  }) {
    const transaction = new anchor.web3.Transaction();
    instructions.forEach((instruction) => transaction.add(instruction));

    // Prepare for sending the transaction
    const { blockhash } = await provider.connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = serviceWallet.publicKey;

    // Sign the transaction with both service wallet and other required signers
    transaction.sign(serviceWallet, ...signers);

    // serialize, pass

    // SERVER

    // Send the transaction
    const signature = await provider.connection.sendRawTransaction(
      transaction.serialize()
    );
    await provider.connection.confirmTransaction(signature, "confirmed");
  }

  it("Both users should have 1000 USDC at start", async () => {
    // Fetch the associated token accounts for both users
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user, // Assuming 'user' is the payer for creating the account
      mintUSDC,
      user.publicKey // Owner of the token account
    );

    const user2TokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user2, // Assuming 'user2' is the payer for creating the account
      mintUSDC,
      user2.publicKey // Owner of the token account
    );

    // Fetch and check balances
    const userBalance = await getTokenAccountBalance(
      provider.connection,
      userTokenAccount.address
    );
    const user2Balance = await getTokenAccountBalance(
      provider.connection,
      user2TokenAccount.address
    );

    // Since 1000 USDC was minted with 6 decimal places, the expected amount is 1000 * 1_000_000
    const expectedAmount = 1000 * 1_000_000;

    assert.equal(userBalance, expectedAmount, "User 1 should have 1000 USDC");
    assert.equal(user2Balance, expectedAmount, "User 2 should have 1000 USDC");
  });

  it("executes a transaction signed by user but paid by service wallet", async () => {
    const executeTransactionInstruction =
      await createExecuteTransactionInstruction({
        program,
        senderPublicKey: user.publicKey,
        senderUsdcAccount: userTokenAccount,
        receiverUsdcAccount: user2TokenAccount,
        daoUsdcAccount: daoTokenAccount,
        stateAccountPublicKey: stateAccount.publicKey,
        amount: 50 * 1_000_000,
        senderUserAccount,
        receiverUserAccount,
      });

    // Send the transaction
    await sendTransactionWithServiceWalletAsPayer({
      provider,
      serviceWallet: transactionServiceWallet,
      instructions: [executeTransactionInstruction],
      signers: [user],
    });

    // Here, you can add assertions to verify the state after the transaction
    const userBalance = await getTokenAccountBalance(
      provider.connection,
      userTokenAccount
    );
    const user2Balance = await getTokenAccountBalance(
      provider.connection,
      user2TokenAccount
    );
    const daoBalance = await getTokenAccountBalance(
      provider.connection,
      daoTokenAccount
    );

    assert.equal(userBalance, 950 * 1_000_000, "User 1 should have 950 USDC");

    // Receiver (user2) should have their original balance plus the received amount minus the transaction fee
    // Calculating the expected amount received after subtracting the fee
    const expectedReceivedAmount = 50 * 1_000_000 - 150_000; // 50 USDC in lamports minus the fee in lamports
    assert.equal(
      user2Balance,
      1_000_000_000 + expectedReceivedAmount,
      "User 2 should have their balance increased by 50 USDC minus the 0.3% fee"
    );

    // DAO should have the transaction fee
    assert.equal(
      daoBalance,
      1_000_000_000 + 150_000,
      "DAO should have the 0.3% transaction fee"
    );
  });
});
