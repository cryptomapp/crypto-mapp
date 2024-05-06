import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { CryptomProtocol } from "../target/types/cryptom_protocol";

export async function initializeState(
  program: Program<CryptomProtocol>,
  stateAccount: Keypair,
  payer: Keypair,
  mintUSDC: PublicKey,
  transactionFeePercentage: number,
  daoPubkey: PublicKey,
  userPubkey: PublicKey,
  merchantPubkey: PublicKey,
  transactionPubkey: PublicKey,
  reviewPubkey: PublicKey
): Promise<void> {
  await program.methods
    .initialize(
      mintUSDC,
      transactionFeePercentage,
      daoPubkey,
      userPubkey,
      merchantPubkey,
      transactionPubkey,
      reviewPubkey
    )
    .accounts({
      state: stateAccount.publicKey,
      user: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([stateAccount, payer])
    .rpc();
}

export async function fundAccount(
  connection: Connection,
  account: Keypair
): Promise<void> {
  const airdropSignature = await connection.requestAirdrop(
    account.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
}

export async function calculatePDA(
  programId: PublicKey,
  account: Keypair,
  seedPrefix: string
): Promise<[PublicKey, number]> {
  const seeds = seedPrefix
    ? [Buffer.from(seedPrefix), account.publicKey.toBuffer()]
    : [account.publicKey.toBuffer()];
  return PublicKey.findProgramAddressSync(seeds, programId);
}
