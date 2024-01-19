// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { CryptoMapp } from "../target/types/crypto_mapp";
// import { assert } from "chai";
// import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
// import {
//   createMint,
//   getAccount,
//   getOrCreateAssociatedTokenAccount,
//   mintTo,
//   TOKEN_PROGRAM_ID,
// } from "@solana/spl-token";

// describe("execute_transaction tests", () => {
//   // Setup the provider
//   anchor.setProvider(anchor.AnchorProvider.env());
//   const provider = anchor.AnchorProvider.local();
//   const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

//   // Constants
//   const USDC_DECIMALS = 6;

//   // Keypair generation
//   const payer = Keypair.generate();
//   const mintAuthority = Keypair.generate();
//   const client = Keypair.generate();
//   const merchant = Keypair.generate();
//   const dao = Keypair.generate();

//   // Variable declarations
//   let mint: PublicKey;
//   let clientATA, merchantATA, daoATA;

//   // Setup before tests
//   before(async () => {
//     // Airdrop SOL to all the keypairs
//     for (const kp of [payer, mintAuthority, client, merchant, dao]) {
//       await provider.connection.confirmTransaction(
//         await provider.connection.requestAirdrop(
//           kp.publicKey,
//           LAMPORTS_PER_SOL
//         ),
//         "confirmed"
//       );
//     }

//     // Create the mock USDC mint
//     mint = await createMint(
//       provider.connection,
//       payer,
//       mintAuthority.publicKey,
//       null,
//       USDC_DECIMALS
//     );

//     // Create Associated Token Accounts for client, merchant, and dao
//     [clientATA, merchantATA, daoATA] = await Promise.all([
//       getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         payer,
//         mint,
//         client.publicKey
//       ),
//       getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         payer,
//         mint,
//         merchant.publicKey
//       ),
//       getOrCreateAssociatedTokenAccount(
//         provider.connection,
//         payer,
//         mint,
//         dao.publicKey
//       ),
//     ]);

//     // Mint mock USDC to the client
//     await mintTo(
//       provider.connection,
//       payer,
//       mint,
//       clientATA.address,
//       mintAuthority,
//       1000 * 10 ** USDC_DECIMALS
//     );
//   });
// });
