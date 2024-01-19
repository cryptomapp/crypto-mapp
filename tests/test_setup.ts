import {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

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
