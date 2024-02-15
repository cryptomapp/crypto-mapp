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
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );
  const usersWalletPubkey = new PublicKey(
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );
  const merchantsWalletPubkey = new PublicKey(
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );
  const transactionsWalletPubkey = new PublicKey(
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );
  const reviewsWalletPubkey = new PublicKey(
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );

  await program.rpc.initialize(
    usdcMintPubkey,
    transactionFee,
    daoPubkey,
    usersWalletPubkey,
    merchantsWalletPubkey,
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
  console.log(
    "User Wallet Public Key:",
    stateAccount.usersWalletPubkey.toString()
  );
  console.log(
    "Merchant Wallet Public Key:",
    stateAccount.merchantsWalletPubkey.toString()
  );
  console.log(
    "Review Wallet Public Key:",
    stateAccount.reviewsWalletPubkey.toString()
  );
  console.log("Merchant Counter:", stateAccount.merchantCounter);
}

main()
  .then(() => console.log("Completed"))
  .catch((err) => console.error(err));
