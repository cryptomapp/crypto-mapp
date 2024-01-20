import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { fundAccount, calculatePDA, initializeState } from "./test_setup";

describe.only("Merchant Functionality Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

  let stateAccount: anchor.web3.Keypair;
  let daoPubkey: anchor.web3.PublicKey;
  let user: anchor.web3.Keypair;
  let userPda: anchor.web3.PublicKey;
  let referrer: anchor.web3.Keypair;
  let referrerPda: anchor.web3.PublicKey;

  beforeEach(async () => {
    user = anchor.web3.Keypair.generate();
    referrer = anchor.web3.Keypair.generate();
    stateAccount = anchor.web3.Keypair.generate();
    daoPubkey = anchor.web3.Keypair.generate().publicKey; // Dummy DAO pubkey

    await fundAccount(provider.connection, user);
    await fundAccount(provider.connection, referrer);
    await fundAccount(provider.connection, stateAccount);

    [userPda] = await calculatePDA(program.programId, user);
    [referrerPda] = await calculatePDA(program.programId, referrer);

    await initializeState(program, stateAccount, user, daoPubkey);
    await initializeNewUser();
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

  it("Initializes a new merchant", async () => {
    // Add more assertions as needed, e.g., check NFT identifier
  });

  // Add more tests here, such as minting EXP with referrer, handling errors, etc.
});
