import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA } from "./test_setup";

describe("User Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let user: anchor.web3.Keypair;
  let userPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    await fundAccount(provider.connection, user);
    [userPda] = await calculatePDA(program.programId, user, "user");
  });

  async function initializeNewUser() {
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: userPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  it("Initializes a new user", async () => {
    await initializeNewUser();

    // Fetch the UserExp account
    const userExpAccount = await program.account.user.fetch(userPda);

    // Assertions
    assert.equal(
      userExpAccount.expPoints,
      100,
      "User should have 100 EXP points after initialization"
    );
  });

  it("Checks if a user exists", async () => {
    await initializeNewUser();

    // Check if the user exists
    try {
      await program.methods.checkUserExists().accounts({ user: userPda }).rpc();

      // If no error is thrown, the user exists
      assert.isTrue(true, "User exists");
    } catch (error) {
      console.error("Error message:", error);
      assert.fail("User should exist but checkUserExists threw an error");
    }
  });

  it("Initializes a new user with a referrer", async () => {
    // Create a referrer user
    const referrer = anchor.web3.Keypair.generate();
    await fundAccount(provider.connection, referrer);
    const [referrerPda] = await calculatePDA(
      program.programId,
      referrer,
      "user"
    );

    console.log("UserPda:", userPda.toBase58());
    console.log("ReferrerPda:", referrerPda.toBase58());

    await program.methods
      .initializeUser()
      .accounts({
        userAccount: referrerPda,
        user: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([referrer])
      .rpc();

    // Initialize a new user with the referrer
    await program.methods
      .initializeUserWithReferrer()
      .accounts({
        userAccount: userPda,
        user: user.publicKey,
        referrerAccount: referrerPda,
        referrer: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch and verify the accounts
    const newUserExpAccount = await program.account.user.fetch(userPda);
    const referrerExpAccount = await program.account.user.fetch(referrerPda);

    // Assertions
    assert.equal(
      newUserExpAccount.expPoints,
      150,
      "New user should have 150 EXP points after initialization with referrer"
    );
    assert.equal(
      referrerExpAccount.expPoints,
      150,
      "Referrer should have 150 EXP points after referral"
    );
    assert.strictEqual(
      newUserExpAccount.referrer.toString(),
      referrer.publicKey.toString(),
      "New user's referrer public key should match the referrer's public key"
    );
  });

  it("Fails to initialize an already existing user", async () => {
    // Create a new user keypair
    const newUser = anchor.web3.Keypair.generate();
    await fundAccount(provider.connection, newUser);
    const [newuserPda] = await calculatePDA(program.programId, newUser, "user");

    // Initialize the new user
    await program.methods
      .initializeUser()
      .accounts({
        userAccount: newuserPda,
        user: newUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    // Fetch the UserExp account to confirm initialization
    const userExpAccount = await program.account.user.fetch(newuserPda);
    assert.equal(
      userExpAccount.expPoints,
      100,
      "User should have 100 EXP points after initialization"
    );

    // Attempt to reinitialize the same user, expecting an error
    try {
      await program.methods
        .initializeUser()
        .accounts({
          userAccount: newuserPda,
          user: newUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();

      assert.fail("Reinitialization did not fail as expected");
    } catch (error) {
      // Check if the error is for an already existing user
      const isUserAlreadyExistsError = error.message.includes("0x0"); // handled by Anchor
      assert.isTrue(
        isUserAlreadyExistsError,
        "Error should be for already existing user"
      );
    }
  });
});
