mod merchant;
mod review;
mod transaction;
mod user;

use crate::merchant::*;
use crate::review::*;
use crate::transaction::*;
use crate::user::*;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;

declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

impl From<ErrorCode> for ProgramError {
    fn from(e: ErrorCode) -> ProgramError {
        ProgramError::Custom(e as u32)
    }
}

#[program]
pub mod crypto_mapp {

    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    pub fn initialize(ctx: Context<Initialize>, dao_pubkey: Pubkey) -> ProgramResult {
        let state = &mut ctx.accounts.state;
        state.dao_pubkey = dao_pubkey;
        Ok(())
    }

    pub fn initialize_user(ctx: Context<InitializeUser>) -> ProgramResult {
        user::initialize_user(ctx)
    }

    pub fn initialize_user_with_referrer(
        ctx: Context<InitializeUserWithReferrer>,
    ) -> ProgramResult {
        user::initialize_user_with_referrer(ctx)
    }

    pub fn check_user_exists(ctx: Context<CheckUserExists>) -> ProgramResult {
        user::check_user_exists(ctx)
    }

    pub fn initialize_merchant(
        ctx: Context<InitializeMerchant>,
        nft_identifier: CnftIdentifier,
    ) -> ProgramResult {
        merchant::initialize_merchant(ctx, nft_identifier)
    }

    pub fn initialize_merchant_with_referrer(
        ctx: Context<InitializeMerchantWithReferrer>,
        nft_identifier: CnftIdentifier,
    ) -> ProgramResult {
        msg!("DEV: User: {}", ctx.accounts.user.to_account_info().key);

        merchant::initialize_merchant_with_referrer(ctx, nft_identifier)
    }

    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, amount: u64) -> ProgramResult {
        transaction::execute_transaction(ctx, amount)
    }

    pub fn add_review(
        ctx: Context<AddReview>,
        transaction_id: Pubkey,
        rating: u8,
    ) -> ProgramResult {
        review::add_review(ctx, transaction_id, rating)
    }
}

#[account]
pub struct ProgramState {
    dao_pubkey: Pubkey,
    merchant_counter: u32,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 40)] // Adjust the space as needed
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The specified user does not exist.")]
    UserDoesNotExist,
    #[msg("The specified user already exists.")]
    UserAlreadyExists,
    #[msg("The specified referrer does not exist.")]
    ReferrerDoesNotExist,
    #[msg("Transaction amount is too low.")]
    TransactionAmountTooLow,
    #[msg("Insufficient funds for the transaction.")]
    InsufficientFunds,
    #[msg("Invalid rating provided.")]
    InvalidRating,
    #[msg("Invalid referrer provided.")]
    InvalidReferrer,
    #[msg("Unauthorized.")]
    Unauthorized,
}
