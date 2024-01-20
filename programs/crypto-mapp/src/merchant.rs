use crate::ErrorCode;
use crate::User;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

// Function to mint EXP for becoming a merchant
pub fn mint_exp_for_merchant(ctx: Context<MintExpForMerchant>) -> ProgramResult {
    let user_exp_account = &mut ctx.accounts.user;

    // Check if the user is initialized
    if !user_exp_account.is_initialized {
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
    pub user: Account<'info, User>,
}
