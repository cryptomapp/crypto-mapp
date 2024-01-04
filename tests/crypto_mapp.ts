import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { expect } from "chai";

describe("crypto-mapp", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

  it("Initializes program state with owner", async () => {
    // Generate a new keypair for the state account
    const stateKeypair = anchor.web3.Keypair.generate();

    // Call the initialize function
    await program.methods
      .initialize()
      .accounts({
        state: stateKeypair.publicKey,
        user: provider.wallet.publicKey, // The wallet initializing (and thus owning) the program
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([stateKeypair])
      .rpc();

    // Fetch and check the initialized state
    const stateAccount = await program.account.programState.fetch(
      stateKeypair.publicKey
    );
    expect(stateAccount.owner.toBase58()).to.equal(
      provider.wallet.publicKey.toBase58()
    );
  });

  it("Can create a merchant by the owner", async () => {
    // Assuming stateKeypair is the same as used in initialization
    const stateKeypair = anchor.web3.Keypair.generate();
    const merchantKeypair = anchor.web3.Keypair.generate();
    const arweaveId = "some_arweave_id_here";

    // Initialize the state with the owner first
    await program.methods
      .initialize()
      .accounts({
        state: stateKeypair.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([stateKeypair]) // Signer for initializing state
      .rpc();

    // Call the 'createMerchant' function from the program
    await program.methods
      .createMerchant(arweaveId)
      .accounts({
        merchant: merchantKeypair.publicKey,
        user: provider.wallet.publicKey,
        payer: provider.wallet.publicKey, // Owner's wallet pays for transaction
        state: stateKeypair.publicKey, // Initialized state account
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([merchantKeypair]) // Signer for creating merchant
      .rpc();

    // Fetch the newly created merchant account
    const merchantAccount = await program.account.merchant.fetch(
      merchantKeypair.publicKey
    );

    // Assertions
    expect(merchantAccount.owner.toBase58()).to.equal(
      provider.wallet.publicKey.toBase58()
    );
    expect(merchantAccount.arweaveId).to.equal(arweaveId);
  });
});
