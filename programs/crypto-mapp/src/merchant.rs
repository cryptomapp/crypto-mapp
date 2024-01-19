use crate::ErrorCode;
use crate::UserExp; // Import ErrorCode from your lib.rs
use anchor_lang::prelude::*;

// Function to mint EXP for becoming a merchant
pub fn mint_exp_for_merchant(ctx: Context<MintExpForMerchant>) -> Result<()> {
    let user_exp_account = &mut ctx.accounts.user_exp;

    // Check if the user exists
    if user_exp_account.exp_points == 0 {
        return Err(ErrorCode::UserDoesNotExist.into());
    }

    // Mint 100 EXP to the user
    user_exp_account.exp_points += 100;

    msg!("100 EXP minted for becoming a merchant");
    Ok(())
}

#[derive(Accounts)]
pub struct MintExpForMerchant<'info> {
    #[account(mut)]
    pub user_exp: Account<'info, UserExp>,
}
