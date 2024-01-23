mod merchant;
mod transaction;
mod user;

use crate::merchant::*;
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

    // Function to add a review for a merchant
    pub fn add_review(
        ctx: Context<AddReview>,
        transaction_id: Pubkey,
        rating: u8,
    ) -> ProgramResult {
        // Ensure the rating is within the valid range
        if rating < 1 || rating > 5 {
            return Err(ErrorCode::InvalidRating.into());
        }

        // No need to manually check if the signer is DAO, as it's done in the context constraint

        // Add the review
        let review = Review {
            transaction_id,
            rating,
        };
        let merchant_account = &mut ctx.accounts.merchant;
        // merchant_account.reviews.push(review);

        Ok(())
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

#[derive(Accounts)]
pub struct AddReview<'info> {
    #[account(mut)]
    pub merchant: Account<'info, Merchant>,
    #[account(constraint = state.dao_pubkey == signer.key())] // Ensure signer is DAO
    pub state: Account<'info, ProgramState>,
    /// CHECK: The `dao` field represents the DAO signer. We check that the key of this account
    /// matches the known DAO public key to ensure that the caller is authorized to add reviews.
    #[account(signer)]
    pub signer: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Review {
    transaction_id: Pubkey, // Transaction ID for which the review is being left
    rating: u8,             // Review rating, e.g., 1 to 5
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
