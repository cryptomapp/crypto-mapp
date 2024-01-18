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
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();
  const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

  const USDC_DECIMALS = 6;

  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const client = Keypair.generate();
  const merchant = Keypair.generate();
  const dao = Keypair.generate();
  let mint: PublicKey;
  let clientATA, merchantATA, daoATA;

  before(async () => {
    for (const kp of [payer, mintAuthority, client, merchant, dao]) {
      const airdropSignature = await provider.connection.requestAirdrop(
        kp.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(
        airdropSignature,
        "confirmed"
      );
    }

    mint = await createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      USDC_DECIMALS
    );

    clientATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      client.publicKey
    );
    merchantATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      merchant.publicKey
    );
    daoATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      dao.publicKey
    );

    await mintTo(
      provider.connection,
      payer,
      mint,
      clientATA.address,
      mintAuthority,
      1000 * 10 ** USDC_DECIMALS
    );
  });

  it("executes transaction and transfers USDC correctly", async () => {
    const amount = 50 * 10 ** USDC_DECIMALS; // 50 USDC in micro-units

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

    console.log("Client starting balance:", clientStartingBalance.amount);
    console.log("Merchant starting balance:", merchantStartingBalance.amount);
    console.log("DAO starting balance:", daoStartingBalance.amount);

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

    const initialClientBalance = 1000 * 10 ** USDC_DECIMALS; // 1000 USDC
    const fee = amount * 0.003; // 0.3% fee
    const expectedClientBalance = initialClientBalance - amount;
    const expectedMerchantBalance = amount - fee;
    const expectedDaoBalance = fee;

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
});
