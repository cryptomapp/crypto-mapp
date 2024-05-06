const anchor = require("@coral-xyz/anchor");
const { SystemProgram, Keypair, PublicKey, clusterApiUrl, Connection } =
  anchor.web3;
const fs = require("fs");

// Configure the provider to use the Devnet cluster.
const provider = new anchor.AnchorProvider(
  new Connection(clusterApiUrl("devnet"), "confirmed"),
  new anchor.Wallet(
    Keypair.fromSecretKey(
      Uint8Array.from(
        JSON.parse(
          fs.readFileSync("/Users/twentone37/my-solana-wallet.json", "utf-8")
        )
      )
    )
  ),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

const program = anchor.workspace.CryptoMapp;

async function main() {
  const programState = Keypair.generate();

  const transactionFee = 30;
  const usdcMintPubkey = new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );
  const daoPubkey = new PublicKey(
    "EDEb9ucMFsBFb2mq3CN564vq1T7wRCaipq2NHhov299s"
  );
  const onboardingWalletPubkey = new PublicKey(
    "4syDs7MTrCr6HCvX3vvW2LNHbdDY1Mk3MCxRCZupGgM2"
  );
  const merchantIdWalletPubkey = new PublicKey(
    "DwiSCnPsqpZrLHcpRiQZRp9RCz3ruLH3DPxWjWgP5mq5"
  );
  const transactionsWalletPubkey = new PublicKey(
    "HXFcg6GufXAXcT56oWPZanbw9dk3pCKStu8VzGzDFbwJ"
  );
  const reviewsWalletPubkey = new PublicKey(
    "AzX2DksAq6mDR8hxaS5A4AZPC8KorHzqaDUcqzZF91rh"
  );

  await program.rpc.initialize(
    usdcMintPubkey,
    transactionFee,
    daoPubkey,
    onboardingWalletPubkey,
    merchantIdWalletPubkey,
    transactionsWalletPubkey,
    reviewsWalletPubkey,
    {
      accounts: {
        state: programState.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [programState],
    }
  );

  // Fetch the state of the account
  const stateAccount = await program.account.programState.fetch(
    programState.publicKey
  );

  console.log("programState: ", programState.publicKey);

  // Print values from the state
  console.log("DAO Public Key:", stateAccount.daoPubkey.toString());
  console.log("Transaction Fee:", stateAccount.transactionFeePercentage);
  console.log(
    "User Wallet Public Key:",
    stateAccount.onboardingServiceWalletPubkey.toString()
  );
  console.log(
    "Merchant Wallet Public Key:",
    stateAccount.merchantIdServiceWalletPubkey.toString()
  );
  console.log(
    "Transaction Wallet Public Key:",
    stateAccount.transactionServiceWalletPubkey.toString()
  );
  console.log(
    "Review Wallet Public Key:",
    stateAccount.reviewServiceWalletPubkey.toString()
  );
  console.log("Merchant Counter:", stateAccount.merchantCounter);
}

main()
  .then(() => console.log("Completed"))
  .catch((err) => console.error(err));
