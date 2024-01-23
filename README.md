# CryptoMapp

CryptoMapp is a decentralized application built on the Solana blockchain, focused on providing a platform for users to become merchants in a Latin America-based marketplace. Merchants are represented by NFTs and hold data on Arweave. The platform allows for discovering merchants on a map and integrating a payment system.

## Features

- **Become a Merchant**: Users can register to become merchants, represented by NFTs.
- **Discover Merchants**: Users can discover merchant services on a map interface.
- **Payment Integration**: The platform includes a payment system with a minor fee structure.

## Getting Started

### Prerequisites

- Install [Node.js](https://nodejs.org/en/)
- Install [Rust](https://www.rust-lang.org/tools/install)
- Install [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools)
- Install [Anchor Framework](https://project-serum.github.io/anchor/getting-started/installation.html)

### Installation

1. Clone the repository:

   ```
   git clone [https://github.com/cryptomapp/solana.git](https://github.com/cryptomapp/solana.git)
   ```

2. Navigate to the project directory:

   ```
   cd CryptoMapp
   ```

3. Install packages with yarn:

   ```
   yarn install
   ```

4. Build the Anchor project:

   ```
   anchor build
   ```

5. Test the project:

   ```
   anchor test
   ```

### Usage

- **Initialize the Program**: Deploy and initialize the program with the owner's wallet.
- **Become a Merchant**: Use the dApp interface to submit a transaction and become a merchant.

### Development

Describe the steps for local development, including how to:

- Compile the program
- Deploy to local/testnet/mainnet
- Run tests
