import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoMapp } from "../target/types/crypto_mapp";
import { assert } from "chai";
import { Keypair } from "@solana/web3.js";

describe("Program Initialization Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();
  const program = anchor.workspace.CryptoMapp as Program<CryptoMapp>;

  // Generate a new keypair for testing and use its public key
  const testDaoKeypair = Keypair.generate();
  const testDaoPubkey = testDaoKeypair.publicKey;

  const testUsersWalletKeypair = Keypair.generate();
  const testUsersWalletPubkey = testUsersWalletKeypair.publicKey;

  const testMerchantWalletKeypair = Keypair.generate();
  const testMerchantWalletPubkey = testMerchantWalletKeypair.publicKey;

  const testReviewsWalletKeypair = Keypair.generate();
  const testReviewsWalletPubkey = testReviewsWalletKeypair.publicKey;

  it("initializes the program state with the test DAO public key", async () => {
    // Generate a new keypair for the program state account
    const programStateAccount = Keypair.generate();

    // Send a transaction to initialize the program state
    await program.methods
      .initialize(
        testDaoPubkey,
        testUsersWalletPubkey,
        testMerchantWalletPubkey,
        testReviewsWalletPubkey
      )
      .accounts({
        state: programStateAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([programStateAccount])
      .rpc();

    // Fetch the program state account
    const state = await program.account.programState.fetch(
      programStateAccount.publicKey
    );

    // Assertions
    assert.ok(
      state.daoPubkey.equals(testDaoPubkey),
      "DAO public key should be set correctly in the program state"
    );
    assert.ok(
      state.usersWalletPubkey.equals(testUsersWalletPubkey),
      "Users wallet public key should be set correctly in the program state"
    );
    assert.ok(
      state.merchantsWalletPubkey.equals(testMerchantWalletPubkey),
      "Merchant wallet public key should be set correctly in the program state"
    );
    assert.ok(
      state.reviewsWalletPubkey.equals(testReviewsWalletPubkey),
      "Review wallet public key should be set correctly in the program state"
    );
    assert.ok(state.merchantCounter == 0);
  });
});
