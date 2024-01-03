import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { expect } from "chai";

describe("crypto-mapp", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

  it("Can create a merchant", async () => {
    // Generate a new keypair for the merchant account
    const merchantKeypair = anchor.web3.Keypair.generate();

    // Define the arweave_id to pass to the function
    const arweaveId = "some_arweave_id_here";

    // Call the 'createMerchant' function from the program using the updated syntax
    await program.methods
      .createMerchant(arweaveId)
      .accounts({
        merchant: merchantKeypair.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([merchantKeypair])
      .rpc();

    // Fetch the newly created merchant account
    const merchantAccount = await program.account.merchant.fetch(
      merchantKeypair.publicKey
    );

    // Assertions to check if the merchant was created correctly
    expect(merchantAccount.owner.toBase58()).equal(
      provider.wallet.publicKey.toBase58()
    );
    expect(merchantAccount.arweaveId).equal(arweaveId);
  });
});
