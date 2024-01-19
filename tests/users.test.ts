import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA } from "./test_setup"; // Assuming you have a test_setup file

describe("User Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let user: anchor.web3.Keypair;
  let userExpPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    await fundAccount(provider.connection, user);
    [userExpPda] = await calculatePDA(program.programId, user);
  });

  async function initializeNewUser() {
    await program.methods
      .initializeUser()
      .accounts({
        userExp: userExpPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
  }

  it("Initializes a new user", async () => {
    await initializeNewUser();

    // Fetch the UserExp account
    const userExpAccount = await program.account.userExp.fetch(userExpPda);

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
      await program.methods
        .checkUserExists()
        .accounts({ userExp: userExpPda })
        .rpc();

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
    const [referrerExpPda] = await calculatePDA(program.programId, referrer);
    await program.methods
      .initializeUser()
      .accounts({
        userExp: referrerExpPda,
        user: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([referrer])
      .rpc();

    // Initialize a new user with the referrer
    await program.methods
      .initializeUserWithReferrer()
      .accounts({
        userExp: userExpPda,
        user: user.publicKey,
        referrerExp: referrerExpPda,
        referrer: referrer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch and verify the accounts
    const newUserExpAccount = await program.account.userExp.fetch(userExpPda);
    const referrerExpAccount = await program.account.userExp.fetch(
      referrerExpPda
    );

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
  });

  // TODO: this test fails with 0x0 instead of 0x1
  it("Fails to initialize an already existing user", async () => {
    // Create a new user keypair
    const newUser = anchor.web3.Keypair.generate();
    await fundAccount(provider.connection, newUser);
    const [newUserExpPda] = await calculatePDA(program.programId, newUser);

    // Initialize the new user
    await program.methods
      .initializeUser()
      .accounts({
        userExp: newUserExpPda,
        user: newUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    // Fetch the UserExp account to confirm initialization
    const userExpAccount = await program.account.userExp.fetch(newUserExpPda);
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
          userExp: newUserExpPda,
          user: newUser.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();

      assert.fail("Reinitialization did not fail as expected");
    } catch (error) {
      console.error("Error message:", error);
      // Check if the error is for an already existing user
      const isUserAlreadyExistsError = error.message.includes("0x1");
      assert.isTrue(
        isUserAlreadyExistsError,
        "Error should be for already existing user"
      );
    }
  });
});
