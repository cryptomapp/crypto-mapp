import * as anchor from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CryptoMapp } from "../target/types/crypto_mapp"; // Adjust the import path as needed

describe("crypto_mapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  it("Initializes a new user", async () => {
    const user = anchor.web3.Keypair.generate();

    // Fund the user account with some SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user.publicKey,
        LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    // Calculate the PDA for the user_exp account
    const [userExpPda, _bump] = PublicKey.findProgramAddressSync(
      [user.publicKey.toBuffer()],
      program.programId
    );

    // Initialize the user
    await program.methods
      .initializeUser()
      .accounts({
        userExp: userExpPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch and log the initialized account data
    const userAccount = await program.account.userExp.fetch(userExpPda);
    console.log("User EXP Points:", userAccount.expPoints);
  });
});
