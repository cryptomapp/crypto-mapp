// 1. Importing necessary modules and macros from the Anchor framework
use anchor_lang::prelude::*;

// 2. Declaring the unique ID for your program
declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

// 3. Define the Merchant struct which holds data for each merchant
#[account]
pub struct Merchant {
    pub owner: Pubkey,
    pub arweave_id: String,
}

// 4. Define the context for the 'create_merchant' instruction
#[derive(Accounts)]
pub struct CreateMerchant<'info> {
    #[account(init, payer = user, space = 8 + 32 + 256)]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub user: Signer<'info>, // The user who is paying for the transaction and will be the owner of the merchant
    pub system_program: Program<'info, System>, // Include system program for creating accounts
}

// 5. The main program implementation
#[program]
pub mod crypto_mapp {
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    use super::*;
    // Define the 'create_merchant' function
    pub fn create_merchant(ctx: Context<CreateMerchant>, arweave_id: String) -> ProgramResult {
        let merchant = &mut ctx.accounts.merchant;
        merchant.owner = *ctx.accounts.user.key; // Set the owner of the merchant
        merchant.arweave_id = arweave_id; // Set the Arweave ID from the passed parameter
        Ok(())
    }
}
