use crate::{ErrorCode, ProgramState, User};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use std::mem;

pub fn initialize_merchant(
    ctx: Context<InitializeMerchant>,
    nft_identifier: CnftIdentifier,
) -> ProgramResult {
    let state = &mut ctx.accounts.state;
    let merchant = &mut ctx.accounts.merchant;
    let user_account = &mut ctx.accounts.user_account;

    merchant.nft_identifier = nft_identifier; // Set NFT identifier
    merchant.is_initialized = true; // Mark merchant as initialized
    merchant.user_pubkey = *user_account.to_account_info().key; // Set user pubkey

    state.merchant_counter += 1; // Increment merchant counter

    // Logic to mint EXP to merchant
    user_account.exp_points += 100;

    Ok(())
}

pub fn initialize_merchant_with_referrer(
    ctx: Context<InitializeMerchantWithReferrer>,
    nft_identifier: CnftIdentifier,
) -> ProgramResult {
    let state = &mut ctx.accounts.state;
    let merchant = &mut ctx.accounts.merchant;
    let user_account = &mut ctx.accounts.user_account;
    let referrer_account = &mut ctx.accounts.referrer;

    merchant.nft_identifier = nft_identifier; // Set NFT identifier
    merchant.is_initialized = true; // Mark merchant as initialized
    merchant.user_pubkey = *user_account.to_account_info().key; // Set user pubkey
    state.merchant_counter += 1; // Increment merchant counter

    // Logic to mint EXP to merchant
    user_account.exp_points += 100;

    // Logic to mint EXP to referrer
    if let Some(referrer_pubkey) = user_account.referrer {
        if referrer_pubkey == *referrer_account.to_account_info().key {
            referrer_account.exp_points += 150;
        } else {
            return Err(ErrorCode::InvalidReferrer.into());
        }
    } else {
        return Err(ErrorCode::ReferrerDoesNotExist.into());
    }

    Ok(())
}

#[account]
pub struct Merchant {
    is_initialized: bool,
    nft_identifier: CnftIdentifier,
    user_pubkey: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CnftIdentifier {
    merkle_tree_address: Pubkey,
    leaf_index: u32,
}

#[derive(Accounts)]
pub struct InitializeMerchant<'info> {
    #[account(init, payer = user, space = 8 + mem::size_of::<Merchant>())]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeMerchantWithReferrer<'info> {
    #[account(init, payer = user, space = 8 + mem::size_of::<Merchant>())]
    pub merchant: Account<'info, Merchant>,
    #[account(mut)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub referrer: Account<'info, User>,
}
