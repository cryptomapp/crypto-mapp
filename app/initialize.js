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

  const daoPubkey = new PublicKey(
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );
  const reviewWalletPubkey = new PublicKey(
    "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
  );

  await program.rpc.initialize(daoPubkey, reviewWalletPubkey, {
    accounts: {
      state: programState.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [programState],
  });

  // Fetch the state of the account
  const stateAccount = await program.account.programState.fetch(
    programState.publicKey
  );

  console.log("programState: ", programState.publicKey);

  // Fetch and print the raw byte array of the program state account
  const rawAccountInfo = await provider.connection.getAccountInfo(
    programState.publicKey
  );
  if (rawAccountInfo && rawAccountInfo.data) {
    console.log("Raw Account Data:", rawAccountInfo.data.toJSON());
  } else {
    console.log("No data found in the account");
  }

  // Print values from the state
  console.log("DAO Public Key:", stateAccount.daoPubkey.toString());
  console.log(
    "Review Wallet Public Key:",
    stateAccount.reviewWalletPubkey.toString()
  );
  console.log("Merchant Counter:", stateAccount.merchantCounter);
}

main()
  .then(() => console.log("Completed"))
  .catch((err) => console.error(err));
