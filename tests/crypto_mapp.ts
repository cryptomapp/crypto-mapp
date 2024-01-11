import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { expect } from "chai";

describe("crypto-mapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

  it("Initializes and gets EXP for a new user without a referrer", async () => {
    const userExpKeypair = anchor.web3.Keypair.generate();

    await program.methods
      .initializeUser(null)
      .accounts({
        userExp: userExpKeypair.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userExpKeypair])
      .rpc();

    const userExpAccount = await program.account.userExp.fetch(
      userExpKeypair.publicKey
    );
    expect(userExpAccount.expPoints).to.equal(100);
    expect(userExpAccount.isNew).to.be.false;
  });

  it("Initializes and gets EXP for a new user with a referrer", async () => {
    const userExpKeypair = anchor.web3.Keypair.generate();
    const referrerExpKeypair = anchor.web3.Keypair.generate();

    // Initialize the referrer's EXP account
    await program.methods
      .initializeUser(null)
      .accounts({
        userExp: referrerExpKeypair.publicKey,
        user: provider.wallet.publicKey,
        referrerExp: anchor.web3.SystemProgram.programId, // Placeholder for no referrer
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([referrerExpKeypair])
      .rpc();

    // Initialize the new user with a referrer
    await program.methods
      .initializeUser(referrerExpKeypair.publicKey)
      .accounts({
        userExp: userExpKeypair.publicKey,
        user: provider.wallet.publicKey,
        referrerExp: referrerExpKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userExpKeypair])
      .rpc();

    const userExpAccount = await program.account.userExp.fetch(
      userExpKeypair.publicKey
    );
    const referrerExpAccount = await program.account.userExp.fetch(
      referrerExpKeypair.publicKey
    );
    expect(userExpAccount.expPoints).to.equal(150); // User + referrer bonus
    expect(referrerExpAccount.expPoints).to.equal(50); // Referrer bonus
  });

  // Additional tests as necessary
});
