import * as anchor from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CryptoMapp } from "../target/types/crypto_mapp";

describe("crypto_mapp", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  it("Initializes a new user", async () => {
    const user = anchor.web3.Keypair.generate();

    // Fund the user account with some SOL
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(airdropSignature);

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
    console.log("User EXP Points after initialization:", userAccount.expPoints);
  });

  it("Checks if a user exists", async () => {
    const user = anchor.web3.Keypair.generate();

    // Fund the user account with some SOL
    const airdropSignature = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(airdropSignature);

    // Calculate the PDA for the user_exp account
    const [userExpPda, _bump] = PublicKey.findProgramAddressSync(
      [user.publicKey.toBuffer()],
      program.programId
    );

    // Check if the user exists (should not exist yet)
    try {
      await program.methods
        .checkUserExists()
        .accounts({ userExp: userExpPda })
        .rpc();
      console.log("User exists (before initialization).\n");
    } catch (error) {
      console.log(
        "User does not exist (before initialization).\n",
        error.toString()
      );
    }

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

    // Check if the user exists (should exist now)
    try {
      await program.methods
        .checkUserExists()
        .accounts({ userExp: userExpPda })
        .rpc();
      console.log("User exists (after initialization).\n");
    } catch (error) {
      console.log(
        "User does not exist (after initialization).\n",
        error.toString()
      );
    }
  });

  it("Initializes a new user with a referrer", async () => {
    const newUser = anchor.web3.Keypair.generate();
    const referrer = anchor.web3.Keypair.generate();

    // Fund both accounts with some SOL
    const airdropSignature1 = await provider.connection.requestAirdrop(
      newUser.publicKey,
      LAMPORTS_PER_SOL
    );
    const airdropSignature2 = await provider.connection.requestAirdrop(
      referrer.publicKey,
      LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(airdropSignature1);
    await provider.connection.confirmTransaction(airdropSignature2);

    // Calculate the PDAs for both the new user and the referrer
    const [newUserExpPda, _newUserBump] = PublicKey.findProgramAddressSync(
      [newUser.publicKey.toBuffer()],
      program.programId
    );
    const [referrerExpPda, _referrerBump] = PublicKey.findProgramAddressSync(
      [referrer.publicKey.toBuffer()],
      program.programId
    );

    // Initialize the referrer
    await program.methods
      .initializeUser()
      .accounts({
        userExp: referrerExpPda,
        user: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([referrer])
      .rpc();

    // Initialize the new user with the referrer
    await program.methods
      .initializeUserWithReferrer()
      .accounts({
        userExp: newUserExpPda,
        user: newUser.publicKey,
        referrerExp: referrerExpPda,
        referrer: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    // Fetch and log the initialized account data for both users
    const newUserAccount = await program.account.userExp.fetch(newUserExpPda);
    const referrerAccount = await program.account.userExp.fetch(referrerExpPda);

    console.log(
      "New User EXP Points after initialization:",
      newUserAccount.expPoints
    );
    console.log(
      "Referrer EXP Points after new user initialization:",
      referrerAccount.expPoints
    );
  });
});
