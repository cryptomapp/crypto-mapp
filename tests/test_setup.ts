import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { CryptoMapp } from "../target/types/crypto_mapp";

export async function initializeState(
  program: Program<CryptoMapp>,
  stateAccount: Keypair,
  payer: Keypair,
  daoPubkey: PublicKey
): Promise<void> {
  await program.methods
    .initialize(daoPubkey)
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
  account: Keypair
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [account.publicKey.toBuffer()],
    programId
  );
}

export async function calculateReferrerPdaFromUserAccount(
  program: Program,
  userPublicKey: PublicKey
): Promise<[PublicKey, number] | null> {
  try {
    const userAccount = await program.account.user.fetch(userPublicKey);

    if (userAccount.referrer) {
      const referrerPublicKey = new PublicKey(userAccount.referrer);
      return PublicKey.findProgramAddressSync(
        [referrerPublicKey.toBuffer()],
        program.programId
      );
    }
  } catch (error) {
    console.error("Error fetching user account or calculating PDA:", error);
  }

  return null;
}
