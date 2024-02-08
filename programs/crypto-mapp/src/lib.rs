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

declare_id!("8mDhNcko1rByfWLzVTuddx386JFwFnD3oDPWV2pzBckN");

impl From<ErrorCode> for ProgramError {
    fn from(e: ErrorCode) -> ProgramError {
        ProgramError::Custom(e as u32)
    }
}

#[program]
pub mod crypto_mapp {

    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    pub fn initialize(
        ctx: Context<Initialize>,
        usdc_mint: Pubkey,
        transaction_fee_percentage: u8,
        dao_pubkey: Pubkey,
        onboarding_service_wallet_pubkey: Pubkey,
        merchant_id_service_wallet_pubkey: Pubkey,
        transaction_service_wallet_pubkey: Pubkey,
        review_service_wallet_pubkey: Pubkey,
    ) -> ProgramResult {
        let state = &mut ctx.accounts.state;
        state.merchant_counter = 0;
        state.usdc_mint = usdc_mint;
        state.transaction_fee_percentage = transaction_fee_percentage; // 30 = 0.3%
        state.dao_pubkey = dao_pubkey;
        state.onboarding_service_wallet_pubkey = onboarding_service_wallet_pubkey;
        state.merchant_id_service_wallet_pubkey = merchant_id_service_wallet_pubkey;
        state.transaction_service_wallet_pubkey = transaction_service_wallet_pubkey;
        state.review_service_wallet_pubkey = review_service_wallet_pubkey;
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
        merchant::initialize_merchant_with_referrer(ctx, nft_identifier)
    }

    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, amount: u64) -> ProgramResult {
        transaction::execute_transaction(ctx, amount)
    }

    pub fn add_rating(ctx: Context<AddRating>, rating: u8) -> ProgramResult {
        review::add_rating(ctx, rating)
    }
}

#[account]
pub struct ProgramState {
    usdc_mint: Pubkey,
    transaction_fee_percentage: u8,
    dao_pubkey: Pubkey,
    onboarding_service_wallet_pubkey: Pubkey,
    merchant_id_service_wallet_pubkey: Pubkey,
    transaction_service_wallet_pubkey: Pubkey,
    review_service_wallet_pubkey: Pubkey,
    merchant_counter: u32,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 32 + 8 + 32 + 32 + 32 + 32 + 32 + 4 + 8)]
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
    #[msg("Invalid token account.")]
    InvalidTokenAccount,
    #[msg("Unauthorized.")]
    Unauthorized,
}
