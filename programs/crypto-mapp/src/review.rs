use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

use crate::{Merchant, ProgramState};

// Function to add a rating for a merchant
pub fn add_rating(ctx: Context<AddRating>, rating: u8) -> ProgramResult {
    // Ensure the rating is within the valid range
    if rating < 1 || rating > 5 {
        return Err(ErrorCode::InvalidRating.into());
    }

    // Ensure the caller is the review_wallet
    if ctx.accounts.signer.key() != ctx.accounts.state.review_wallet_pubkey {
        return Err(ErrorCode::Unauthorized.into());
    }

    let merchant_account = &mut ctx.accounts.merchant;
    merchant_account.ratings.push(rating);

    Ok(())
}

#[derive(Accounts)]
pub struct AddRating<'info> {
    #[account(mut)]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub signer: Signer<'info>,
}
