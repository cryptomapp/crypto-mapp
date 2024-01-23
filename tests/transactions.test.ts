import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { assert } from "chai";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("execute_transaction tests", () => {
  // Setup the provider
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();
  const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

  // Constants
  const USDC_DECIMALS = 6;

  // Keypair generation
  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const client = Keypair.generate();
  const merchant = Keypair.generate();
  const dao = Keypair.generate();

  // Variable declarations
  let mint: PublicKey;
  let clientATA, merchantATA, daoATA;

  // Setup before tests
  before(async () => {
    // Airdrop SOL to all the keypairs
    for (const kp of [payer, mintAuthority, client, merchant, dao]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          kp.publicKey,
          LAMPORTS_PER_SOL
        ),
        "confirmed"
      );
    }

    // Create the mock USDC mint
    mint = await createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      USDC_DECIMALS
    );

    // Create Associated Token Accounts for client, merchant, and dao
    [clientATA, merchantATA, daoATA] = await Promise.all([
      getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mint,
        client.publicKey
      ),
      getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mint,
        merchant.publicKey
      ),
      getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mint,
        dao.publicKey
      ),
    ]);

    // Mint mock USDC to the client
    await mintTo(
      provider.connection,
      payer,
      mint,
      clientATA.address,
      mintAuthority,
      1000 * 10 ** USDC_DECIMALS
    );
  });

  // Test case
  it("executes transaction and transfers USDC correctly", async () => {
    const amount = 50 * 10 ** USDC_DECIMALS; // 50 USDC in micro-units

    // Fetch starting balances
    const [clientStartingBalance, merchantStartingBalance, daoStartingBalance] =
      await Promise.all([
        getAccount(provider.connection, clientATA.address),
        getAccount(provider.connection, merchantATA.address),
        getAccount(provider.connection, daoATA.address),
      ]);

    console.log("Client starting balance:", clientStartingBalance.amount);
    console.log("Merchant starting balance:", merchantStartingBalance.amount);
    console.log("DAO starting balance:", daoStartingBalance.amount);

    // Execute the transaction
    await program.methods
      .executeTransaction(new anchor.BN(amount))
      .accounts({
        sender: client.publicKey,
        senderUsdcAccount: clientATA.address,
        receiverUsdcAccount: merchantATA.address,
        daoUsdcAccount: daoATA.address,
        usdcMint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([client])
      .rpc();

    // Fetch final balances
    const [clientFinalBalance, merchantFinalBalance, daoFinalBalance] =
      await Promise.all([
        getAccount(provider.connection, clientATA.address),
        getAccount(provider.connection, merchantATA.address),
        getAccount(provider.connection, daoATA.address),
      ]);

    // Balance calculations
    const initialClientBalance = 1000 * 10 ** USDC_DECIMALS; // 1000 USDC
    const fee = amount * 0.003; // 0.3% fee
    const expectedClientBalance = initialClientBalance - amount;
    const expectedMerchantBalance = amount - fee;
    const expectedDaoBalance = fee;

    // Assertions
    assert.equal(
      clientFinalBalance.amount.toString(),
      expectedClientBalance.toString(),
      "Client balance should be decremented by the transfer amount"
    );
    assert.equal(
      merchantFinalBalance.amount.toString(),
      expectedMerchantBalance.toString(),
      "Merchant balance should be incremented by the transfer amount minus fee"
    );
    assert.equal(
      daoFinalBalance.amount.toString(),
      expectedDaoBalance.toString(),
      "DAO balance should be incremented by the fee amount"
    );
  });

  it("executes transaction with minimum amount correctly", async () => {
    const amount = BigInt(10000); // Smallest non-zero amount in micro-units of USDC, as bigint

    // Fetch initial balances
    const clientStartingBalance = await getAccount(
      provider.connection,
      clientATA.address
    );
    const merchantStartingBalance = await getAccount(
      provider.connection,
      merchantATA.address
    );
    const daoStartingBalance = await getAccount(
      provider.connection,
      daoATA.address
    );

    // Execute the transaction
    await program.methods
      .executeTransaction(new anchor.BN(amount.toString()))
      .accounts({
        sender: client.publicKey,
        senderUsdcAccount: clientATA.address,
        receiverUsdcAccount: merchantATA.address,
        daoUsdcAccount: daoATA.address,
        usdcMint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([client])
      .rpc();

    // Fetch final balances
    const clientFinalBalance = await getAccount(
      provider.connection,
      clientATA.address
    );
    const merchantFinalBalance = await getAccount(
      provider.connection,
      merchantATA.address
    );
    const daoFinalBalance = await getAccount(
      provider.connection,
      daoATA.address
    );

    // Calculate expected balances
    const fee = BigInt(Math.ceil(Number(amount) * 0.003)); // 0.3% fee, rounded up and converted to bigint
    const expectedClientBalance = clientStartingBalance.amount - amount;
    const expectedMerchantBalance =
      merchantStartingBalance.amount + amount - fee;
    const expectedDaoBalance = daoStartingBalance.amount + fee;

    // Assertions
    assert.equal(
      clientFinalBalance.amount,
      expectedClientBalance,
      "Client balance should be decremented by the transfer amount"
    );
    assert.equal(
      merchantFinalBalance.amount,
      expectedMerchantBalance,
      "Merchant balance should be incremented by the transfer amount minus fee"
    );
    assert.equal(
      daoFinalBalance.amount,
      expectedDaoBalance,
      "DAO balance should be incremented by the fee amount"
    );
  });

  it("rejects transactions below the minimum amount", async () => {
    const amountBelowMinimum = BigInt(5000); // Amount below the minimum threshold

    try {
      await program.methods
        .executeTransaction(new anchor.BN(amountBelowMinimum.toString()))
        .accounts({
          sender: client.publicKey,
          senderUsdcAccount: clientATA.address,
          receiverUsdcAccount: merchantATA.address,
          daoUsdcAccount: daoATA.address,
          usdcMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([client])
        .rpc();

      assert.fail(
        "Transaction should have been rejected due to amount being too low"
      );
    } catch (error) {
      const isAmountTooLowError = error.message.includes("0x3");
      assert.isTrue(
        isAmountTooLowError,
        "Error should be for transaction amount being too low"
      );
    }
  });

  it("fails to execute transaction with insufficient funds", async () => {
    const amount = BigInt(2000 * 10 ** USDC_DECIMALS); // 2000 USDC in micro-units, more than the client's balance

    try {
      await program.methods
        .executeTransaction(new anchor.BN(amount.toString()))
        .accounts({
          sender: client.publicKey,
          senderUsdcAccount: clientATA.address,
          receiverUsdcAccount: merchantATA.address,
          daoUsdcAccount: daoATA.address,
          usdcMint: mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([client])
        .rpc();

      assert.fail("Transaction should have failed due to insufficient funds");
    } catch (error) {
      console.log("Error message:", error.message); // Debugging: print the error message
      const isInsufficientFundsError = error.message.includes("0x4");
      assert.isTrue(
        isInsufficientFundsError,
        "Error should be due to insufficient funds"
      );
    }
  });

  it("executes transaction with very large amount correctly", async () => {
    const amount = BigInt(500000 * 10 ** USDC_DECIMALS); // 500,000 USDC in micro-units

    // Mint additional USDC to the client to cover the large transaction amount
    await mintTo(
      provider.connection,
      payer,
      mint,
      clientATA.address,
      mintAuthority,
      amount
    );

    // Fetch initial balances
    const clientStartingBalance = await getAccount(
      provider.connection,
      clientATA.address
    );
    const merchantStartingBalance = await getAccount(
      provider.connection,
      merchantATA.address
    );
    const daoStartingBalance = await getAccount(
      provider.connection,
      daoATA.address
    );

    // Execute the transaction
    await program.methods
      .executeTransaction(new anchor.BN(amount.toString()))
      .accounts({
        sender: client.publicKey,
        senderUsdcAccount: clientATA.address,
        receiverUsdcAccount: merchantATA.address,
        daoUsdcAccount: daoATA.address,
        usdcMint: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([client])
      .rpc();

    // Fetch final balances
    const clientFinalBalance = await getAccount(
      provider.connection,
      clientATA.address
    );
    const merchantFinalBalance = await getAccount(
      provider.connection,
      merchantATA.address
    );
    const daoFinalBalance = await getAccount(
      provider.connection,
      daoATA.address
    );

    // Calculate expected balances
    const fee = (amount * BigInt(3)) / BigInt(1000); // 0.3% fee
    const expectedClientBalance = clientStartingBalance.amount - amount;
    const expectedMerchantBalance =
      merchantStartingBalance.amount + amount - fee;
    const expectedDaoBalance = daoStartingBalance.amount + fee;

    // Assertions
    assert.equal(
      clientFinalBalance.amount,
      expectedClientBalance,
      "Client balance should be decremented by the transfer amount"
    );
    assert.equal(
      merchantFinalBalance.amount,
      expectedMerchantBalance,
      "Merchant balance should be incremented by the transfer amount minus fee"
    );
    assert.equal(
      daoFinalBalance.amount,
      expectedDaoBalance,
      "DAO balance should be incremented by the fee amount"
    );
  });
});
