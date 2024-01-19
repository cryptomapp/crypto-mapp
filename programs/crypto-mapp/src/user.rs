use crate::ErrorCode;
use crate::UserExp;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

// Function to initialize a new user
pub fn initialize_user(ctx: Context<InitializeUser>) -> ProgramResult {
    let user_exp_account = &mut ctx.accounts.user_exp;
    if user_exp_account.is_initialized {
        return Err(ErrorCode::UserAlreadyExists.into());
    }

    user_exp_account.is_initialized = true;
    user_exp_account.exp_points = 100;
    Ok(())
}

// Function to initialize a new user with a referrer
pub fn initialize_user_with_referrer(ctx: Context<InitializeUserWithReferrer>) -> ProgramResult {
    let user_exp_account = &mut ctx.accounts.user_exp;
    let referrer_exp_account = &mut ctx.accounts.referrer_exp;

    if user_exp_account.exp_points != 0 {
        return Err(ErrorCode::UserAlreadyExists.into());
    }
    if referrer_exp_account.exp_points <= 0 {
        return Err(ErrorCode::ReferrerDoesNotExist.into());
    }

    user_exp_account.exp_points = 150;
    referrer_exp_account.exp_points += 50;
    Ok(())
}

// Function to check if a user exists
pub fn check_user_exists(ctx: Context<CheckUserExists>) -> ProgramResult {
    if ctx.accounts.user_exp.to_account_info().lamports() == 0 {
        return Err(ErrorCode::UserDoesNotExist.into());
    }
    Ok(())
}

#[derive(Accounts)]
pub struct CheckUserExists<'info> {
    #[account(mut)]
    pub user_exp: Account<'info, UserExp>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = user, space = 8 + 32 + 4, seeds = [user.key().as_ref()], bump)]
    pub user_exp: Account<'info, UserExp>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUserWithReferrer<'info> {
    #[account(init, payer = user, space = 8 + 32 + 4, seeds = [user.key().as_ref()], bump)]
    pub user_exp: Account<'info, UserExp>,
    #[account(mut, seeds = [referrer.key().as_ref()], bump)]
    pub referrer_exp: Account<'info, UserExp>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: The referrer's public key is used only for deriving the PDA of the referrer_exp account.
    pub referrer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
