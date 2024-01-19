// import * as anchor from "@coral-xyz/anchor";
// import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
// import { CryptoMapp } from "../target/types/crypto_mapp";
// import { fundAccount, calculatePDA } from "./test_setup";
// import { assert } from "chai";

// describe("crypto_mapp", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

//   let newUser, referrer;
//   let newUserExpPda, referrerExpPda;
//   let newUserBump, referrerBump;

//   // Function to fund an account with SOL and calculate its PDA
//   async function setupAccount(account) {
//     const airdropSignature = await provider.connection.requestAirdrop(
//       account.publicKey,
//       LAMPORTS_PER_SOL
//     );

//     await provider.connection.confirmTransaction(airdropSignature);

//     const [pda, bump] = PublicKey.findProgramAddressSync(
//       [account.publicKey.toBuffer()],
//       program.programId
//     );

//     return { pda, bump };
//   }

//   beforeEach(async () => {
//     newUser = anchor.web3.Keypair.generate();
//     await fundAccount(provider.connection, newUser);
//     [newUserExpPda, newUserBump] = await calculatePDA(
//       program.programId,
//       newUser
//     );

//     referrer = anchor.web3.Keypair.generate();
//     await fundAccount(provider.connection, referrer);
//     [referrerExpPda, referrerBump] = await calculatePDA(
//       program.programId,
//       referrer
//     );
//   });

//   it("Initializes a new user", async () => {
//     // Initialize the new user
//     await program.methods
//       .initializeUser()
//       .accounts({
//         userExp: newUserExpPda,
//         user: newUser.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([newUser])
//       .rpc();

//     // Fetch and verify the initialized account data
//     const userAccount = await program.account.userExp.fetch(newUserExpPda);
//     console.log("User EXP Points after initialization:", userAccount.expPoints);
//     assert.equal(
//       userAccount.expPoints,
//       100,
//       "User EXP points should be 100 after initialization"
//     );
//   });

//   it("Checks if a user exists", async () => {
//     // Initialize the user first
//     await program.methods
//       .initializeUser()
//       .accounts({
//         userExp: newUserExpPda,
//         user: newUser.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([newUser])
//       .rpc();

//     // Check if the user exists
//     try {
//       await program.methods
//         .checkUserExists()
//         .accounts({ userExp: newUserExpPda })
//         .rpc();
//       console.log("User exists (after initialization).");
//     } catch (error) {
//       assert.fail(
//         "User should exist after initialization, but checkUserExists failed."
//       );
//     }
//   });

//   it("Initializes a new user with a referrer", async () => {
//     // Initialize the referrer
//     await program.methods
//       .initializeUser()
//       .accounts({
//         userExp: referrerExpPda,
//         user: referrer.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([referrer])
//       .rpc();

//     // Initialize the new user with the referrer
//     await program.methods
//       .initializeUserWithReferrer()
//       .accounts({
//         userExp: newUserExpPda,
//         user: newUser.publicKey,
//         referrerExp: referrerExpPda,
//         referrer: referrer.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([newUser])
//       .rpc();

//     // Fetch and verify the initialized account data for both users
//     const newUserAccount = await program.account.userExp.fetch(newUserExpPda);
//     const referrerAccount = await program.account.userExp.fetch(referrerExpPda);

//     console.log(
//       "New User EXP Points after initialization:",
//       newUserAccount.expPoints
//     );
//     console.log(
//       "Referrer EXP Points after new user initialization:",
//       referrerAccount.expPoints
//     );

//     assert.equal(
//       newUserAccount.expPoints,
//       150,
//       "New User EXP points should be 150 after initialization with a referrer"
//     );
//     assert.equal(
//       referrerAccount.expPoints,
//       150,
//       "Referrer EXP points should be 150 after referring a new user"
//     );
//   });

//   it("Fails to initialize an already existing user", async () => {
//     // Initialize the user first
//     await program.methods
//       .initializeUser()
//       .accounts({
//         userExp: newUserExpPda,
//         user: newUser.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([newUser])
//       .rpc();

//     // Attempt to reinitialize the same user
//     try {
//       await program.methods
//         .initializeUser()
//         .accounts({
//           userExp: newUserExpPda,
//           user: newUser.publicKey,
//           systemProgram: anchor.web3.SystemProgram.programId,
//         })
//         .signers([newUser])
//         .rpc();
//       assert.fail(
//         "Reinitialization should have failed for an already existing user."
//       );
//     } catch (error) {
//       console.log(
//         "Failed to reinitialize an existing user as expected.",
//         error.toString()
//       );
//     }
//   });
//   it("Fails to reinitialize a user with a different referrer", async () => {
//     // Initialize the user first
//     await program.methods
//       .initializeUser()
//       .accounts({
//         userExp: newUserExpPda,
//         user: newUser.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([newUser])
//       .rpc();

//     // Generate a new referrer
//     const anotherReferrer = anchor.web3.Keypair.generate();
//     const anotherReferrerSetup = await setupAccount(anotherReferrer);
//     const anotherReferrerExpPda = anotherReferrerSetup.pda;

//     // Attempt to reinitialize the same user with a different referrer
//     try {
//       await program.methods
//         .initializeUserWithReferrer()
//         .accounts({
//           userExp: newUserExpPda,
//           user: newUser.publicKey,
//           referrerExp: anotherReferrerExpPda,
//           referrer: anotherReferrer.publicKey,
//           systemProgram: anchor.web3.SystemProgram.programId,
//         })
//         .signers([newUser])
//         .rpc();
//       assert.fail(
//         "Reinitialization with a different referrer should have failed."
//       );
//     } catch (error) {
//       console.log(
//         "Failed to reinitialize user with a different referrer as expected.",
//         error.toString()
//       );
//     }
//   });

//   it("Fails to initialize a user with an invalid referrer", async () => {
//     // Generate an invalid referrer (random keypair)
//     const invalidReferrer = anchor.web3.Keypair.generate();

//     // Attempt to initialize a new user with the invalid referrer
//     try {
//       await program.methods
//         .initializeUserWithReferrer()
//         .accounts({
//           userExp: newUserExpPda,
//           user: newUser.publicKey,
//           referrerExp: invalidReferrer.publicKey, // Using public key directly
//           referrer: invalidReferrer.publicKey,
//           systemProgram: anchor.web3.SystemProgram.programId,
//         })
//         .signers([newUser])
//         .rpc();
//       assert.fail(
//         "Initialization with an invalid referrer should have failed."
//       );
//     } catch (error) {
//       console.log(
//         "Failed to initialize user with an invalid referrer as expected.",
//         error.toString()
//       );
//     }
//   });

//   it("Successfully mints EXP for an existing user", async () => {
//     // Initialize the user first
//     await program.methods
//       .initializeUser()
//       .accounts({
//         userExp: newUserExpPda,
//         user: newUser.publicKey,
//         systemProgram: anchor.web3.SystemProgram.programId,
//       })
//       .signers([newUser])
//       .rpc();

//     // Mint EXP for the user
//     await program.methods
//       .mintExpForMerchant()
//       .accounts({ userExp: newUserExpPda })
//       .rpc();

//     // Fetch and verify the updated account data
//     const userAccount = await program.account.userExp.fetch(newUserExpPda);
//     console.log(
//       "User EXP Points after minting for merchant:",
//       userAccount.expPoints
//     );
//     assert.equal(
//       userAccount.expPoints,
//       200,
//       "User EXP points should be 200 after minting for merchant"
//     );
//   });

//   it("Fails to mint EXP for a non-existing user", async () => {
//     const nonExistingUser = anchor.web3.Keypair.generate();
//     const [nonExistingUserExpPda, _] = PublicKey.findProgramAddressSync(
//       [nonExistingUser.publicKey.toBuffer()],
//       program.programId
//     );

//     // Attempt to mint EXP for a non-existing user
//     try {
//       await program.methods
//         .mintExpForMerchant()
//         .accounts({ userExp: nonExistingUserExpPda })
//         .rpc();
//       assert.fail("Minting EXP should have failed for a non-existing user.");
//     } catch (error) {
//       console.log(
//         "Failed to mint EXP for a non-existing user as expected.",
//         error.toString()
//       );
//     }
//   });
// });
