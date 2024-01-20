use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

// Function to initialize a new user without a referrer
pub fn initialize_user(ctx: Context<InitializeUser>) -> ProgramResult {
    let user_account = &mut ctx.accounts.user_account;

    user_account.is_initialized = true;
    user_account.exp_points = 100;
    user_account.referrer = None;

    Ok(())
}

// Function to initialize a new user with a referrer
pub fn initialize_user_with_referrer(ctx: Context<InitializeUserWithReferrer>) -> ProgramResult {
    let user_account = &mut ctx.accounts.user_account;
    let referrer_account = &mut ctx.accounts.referrer_account;

    user_account.is_initialized = true;
    user_account.exp_points = 150;
    user_account.referrer = Some(ctx.accounts.referrer.key());

    referrer_account.exp_points += 50;

    Ok(())
}

// Function to check if a user exists
pub fn check_user_exists(ctx: Context<CheckUserExists>) -> ProgramResult {
    let user_account = &ctx.accounts.user;

    if !user_account.is_initialized {
        return Err(ErrorCode::UserDoesNotExist.into());
    }

    Ok(())
}

#[account]
pub struct User {
    pub is_initialized: bool,
    pub exp_points: u32,
    pub referrer: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct CheckUserExists<'info> {
    pub user: Account<'info, User>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = user, space = 8 + 1 + 4 + 33 + 10, seeds = [user.key().as_ref()], bump)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUserWithReferrer<'info> {
    #[account(init, payer = user, space = 8 + 1 + 4 + 33 + 10, seeds = [user.key().as_ref()], bump)]
    pub user_account: Account<'info, User>,
    #[account(mut, seeds = [referrer.key().as_ref()], bump)]
    pub referrer_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: The referrer's public key is used only for deriving the PDA of the referrer_account account.
    /// We don't need to impose any constraints on the account itself because we're only using the key.
    pub referrer: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
