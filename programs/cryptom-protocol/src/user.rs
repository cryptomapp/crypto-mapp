use crate::{ErrorCode, ProgramState};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use spl_associated_token_account::get_associated_token_address;

pub fn initialize_user(ctx: Context<InitializeUser>) -> ProgramResult {
    if ctx.accounts.service_wallet.key() != ctx.accounts.state.onboarding_service_wallet_pubkey {
        return Err(ErrorCode::Unauthorized.into());
    }

    let usdc_mint = ctx.accounts.state.usdc_mint;
    let user_pubkey = ctx.accounts.user_pubkey.key();
    let associated_usdc_account = get_associated_token_address(&user_pubkey, &usdc_mint);

    let user_account = &mut ctx.accounts.user_account;
    user_account.is_initialized = true;
    user_account.is_merchant = false;
    user_account.exp_points = 100;
    user_account.usdc_account = associated_usdc_account;
    user_account.referrer = None;

    Ok(())
}

pub fn initialize_user_with_referrer(ctx: Context<InitializeUserWithReferrer>) -> ProgramResult {
    if ctx.accounts.service_wallet.key() != ctx.accounts.state.onboarding_service_wallet_pubkey {
        return Err(ErrorCode::Unauthorized.into());
    }
    let user_account = &mut ctx.accounts.user_account;
    let referrer_account = &mut ctx.accounts.referrer_account;

    let usdc_mint = ctx.accounts.state.usdc_mint;
    let user_pubkey = ctx.accounts.user_pubkey.key();
    let associated_usdc_account = get_associated_token_address(&user_pubkey, &usdc_mint);

    user_account.is_initialized = true;
    user_account.is_merchant = false;
    user_account.exp_points = 150;
    user_account.usdc_account = associated_usdc_account;
    user_account.referrer = Some(ctx.accounts.referrer.key());

    referrer_account.exp_points += 50;

    Ok(())
}

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
    pub is_merchant: bool,
    pub exp_points: u32,
    pub usdc_account: Pubkey,
    pub referrer: Option<Pubkey>,
}

#[derive(Accounts)]
pub struct CheckUserExists<'info> {
    pub user: Account<'info, User>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = service_wallet, space = 8 + 1 + 1 + 4 + 33,
        seeds = [b"user".as_ref(), user_pubkey.key().as_ref()], bump)]
    pub user_account: Account<'info, User>,
    /// CHECK: This is not dangerous because it's only used as a seed for PDAs
    pub user_pubkey: UncheckedAccount<'info>,
    #[account(mut)]
    pub service_wallet: Signer<'info>,
    pub state: Account<'info, ProgramState>,
    /// System program is required for creating accounts
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUserWithReferrer<'info> {
    #[account(init, payer = service_wallet, space = 8 + 1 + 1 + 4 + 33 + 32, 
        seeds = [b"user".as_ref(), user_pubkey.key().as_ref()], bump)]
    pub user_account: Account<'info, User>,
    #[account(mut, seeds = [b"user".as_ref(), referrer.key().as_ref()], bump)]
    pub referrer_account: Account<'info, User>,
    /// CHECK: This is checked in the program logic
    pub user_pubkey: AccountInfo<'info>,
    /// CHECK: The referrer's public key is used only for deriving the PDA of the referrer_account account.
    pub referrer: AccountInfo<'info>,
    #[account(mut)]
    pub service_wallet: Signer<'info>,
    pub state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}
