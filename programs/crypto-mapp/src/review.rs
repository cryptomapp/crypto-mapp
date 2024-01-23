use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

use crate::{Merchant, ProgramState};

// Function to add a review for a merchant
pub fn add_review(ctx: Context<AddReview>, transaction_id: Pubkey, rating: u8) -> ProgramResult {
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
