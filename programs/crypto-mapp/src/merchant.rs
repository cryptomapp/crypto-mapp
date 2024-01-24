use crate::{ErrorCode, ProgramState, User};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use std::mem;

const MAX_REVIEWS: usize = 255;

pub fn initialize_merchant(
    ctx: Context<InitializeMerchant>,
    nft_identifier: CnftIdentifier,
) -> ProgramResult {
    let state = &mut ctx.accounts.state;
    let merchant_account = &mut ctx.accounts.merchant_account;
    let user_account = &mut ctx.accounts.user_account;

    merchant_account.nft_identifier = nft_identifier; // Set NFT identifier
    merchant_account.is_initialized = true; // Mark merchant as initialized
    merchant_account.user_pubkey = *user_account.to_account_info().key; // Set user pubkey

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
    let merchant_account = &mut ctx.accounts.merchant_account;
    let user_account = &mut ctx.accounts.user_account;
    let referrer_account = &mut ctx.accounts.referrer_account;
    let referrer_pubkey = ctx.accounts.referrer.key();

    // Set NFT identifier and mark merchant as initialized
    merchant_account.nft_identifier = nft_identifier;
    merchant_account.is_initialized = true;
    merchant_account.user_pubkey = *user_account.to_account_info().key;

    // Increment merchant counter in the state
    state.merchant_counter += 1;

    // Logic to mint EXP to merchant
    user_account.exp_points += 100;

    // Logic to mint EXP to referrer
    match user_account.referrer {
        Some(ref_pubkey) => {
            // Validate that the provided referrer account matches the referrer public key in user_account
            if ref_pubkey == referrer_pubkey {
                // Add EXP points to referrer account
                referrer_account.exp_points += 200;
            } else {
                // Return error if the referrer public key does not match
                return Err(ErrorCode::InvalidReferrer.into());
            }
        }
        None => {
            // Return error if no referrer is set in user_account
            return Err(ErrorCode::ReferrerDoesNotExist.into());
        }
    }

    Ok(())
}

#[account]
pub struct Merchant {
    is_initialized: bool,
    nft_identifier: CnftIdentifier,
    user_pubkey: Pubkey,
    pub ratings: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CnftIdentifier {
    merkle_tree_address: Pubkey,
    leaf_index: u32,
}

#[derive(Accounts)]
pub struct InitializeMerchant<'info> {
    #[account(init, payer = user, space = 8 + mem::size_of::<Merchant>() + MAX_REVIEWS * mem::size_of::<u8>(),
     seeds = [b"merchant".as_ref(), user.key().as_ref()], bump)]
    pub merchant_account: Account<'info, Merchant>,
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
    #[account(init, payer = user, space = 8 + mem::size_of::<Merchant>() + MAX_REVIEWS * mem::size_of::<u8>(),
     seeds = [b"merchant".as_ref(), user.key().as_ref()], bump)]
    pub merchant_account: Account<'info, Merchant>,
    #[account(mut)]
    pub user_account: Account<'info, User>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub referrer_account: Account<'info, User>,
    /// CHECK: This is only used for validation
    pub referrer: AccountInfo<'info>,
}
