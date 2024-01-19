use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

const DAO_PUBKEY: &str = "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy";

impl From<ErrorCode> for ProgramError {
    fn from(e: ErrorCode) -> ProgramError {
        ProgramError::Custom(e as u32)
    }
}

#[program]
pub mod crypto_mapp {
    use std::str::FromStr;

    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;
    use anchor_spl::token::{self, Transfer};

    // Function to initialize a new user
    pub fn initialize_user(ctx: Context<InitializeUser>) -> ProgramResult {
        let user_exp_account = &mut ctx.accounts.user_exp;
        // Ensure the user account is freshly created
        if user_exp_account.exp_points != 0 {
            return Err(ErrorCode::UserAlreadyExists.into());
        }

        user_exp_account.exp_points = 100;
        Ok(())
    }

    // Function to initialize a new user with a referrer
    pub fn initialize_user_with_referrer(ctx: Context<InitializeUserWithReferrer>) -> Result<()> {
        let user_exp_account = &mut ctx.accounts.user_exp;
        let referrer_exp_account = &mut ctx.accounts.referrer_exp;

        // Ensure the user account is freshly created & referrer exists
        if user_exp_account.exp_points != 0 {
            return Err(ErrorCode::UserAlreadyExists.into());
        }
        if referrer_exp_account.exp_points <= 0 {
            return Err(ErrorCode::ReferrerDoesNotExist.into());
        }

        user_exp_account.exp_points = 150; // New user gets 150 EXP
        referrer_exp_account.exp_points += 50; // Referrer gets +50 EXP

        Ok(())
    }

    // Function to check if a user exists
    pub fn check_user_exists(ctx: Context<CheckUserExists>) -> Result<()> {
        require!(
            ctx.accounts.user_exp.to_account_info().lamports() > 0,
            ErrorCode::UserDoesNotExist
        );
        msg!("User exists");
        Ok(())
    }

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

    // Function to execute a transaction
    pub fn execute_transaction(ctx: Context<ExecuteTransaction>, amount: u64) -> ProgramResult {
        // Minimum transaction amount set to 0.01 USDC (10,000 micro-units)
        const MIN_TRANSACTION_AMOUNT: u64 = 10_000;

        // Check if the transaction amount is above the minimum threshold
        if amount < MIN_TRANSACTION_AMOUNT {
            return Err(ErrorCode::TransactionAmountTooLow.into());
        }

        // Check if the sender has sufficient funds
        if ctx.accounts.sender_usdc_account.amount < amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        let fee = amount * 3 / 1000; // 0.3% fee
        let transfer_amount = amount - fee;

        // Transfer USDC to the recipient
        let transfer_to_receiver_cpi_accounts = Transfer {
            from: ctx.accounts.sender_usdc_account.to_account_info(),
            to: ctx.accounts.receiver_usdc_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let transfer_to_receiver_cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_receiver_cpi_accounts,
        );
        token::transfer(transfer_to_receiver_cpi_ctx, transfer_amount)?;

        // Transfer fee to the DAO
        let transfer_to_dao_cpi_accounts = Transfer {
            from: ctx.accounts.sender_usdc_account.to_account_info(),
            to: ctx.accounts.dao_usdc_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let transfer_to_dao_cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_dao_cpi_accounts,
        );
        token::transfer(transfer_to_dao_cpi_ctx, fee)?;

        Ok(())
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

        // Ensure the caller is the DAO
        let dao_pubkey = Pubkey::from_str(DAO_PUBKEY).unwrap();
        if ctx.accounts.signer.key() != dao_pubkey {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Add the review
        let review = Review {
            transaction_id,
            rating,
        };
        let merchant_account = &mut ctx.accounts.merchant;
        merchant_account.reviews.push(review);

        Ok(())
    }
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

#[derive(Accounts)]
pub struct CheckUserExists<'info> {
    #[account(mut)]
    pub user_exp: Account<'info, UserExp>,
}

#[derive(Accounts)]
pub struct MintExpForMerchant<'info> {
    #[account(mut)]
    pub user_exp: Account<'info, UserExp>,
}

#[account]
pub struct UserExp {
    pub exp_points: u32,
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub sender_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub receiver_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dao_usdc_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Merchant {
    // Other fields...
    reviews: Vec<Review>, // List of reviews
}

#[derive(Accounts)]
pub struct AddReview<'info> {
    #[account(mut)]
    pub merchant: Account<'info, Merchant>,
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
    #[msg("Unauthorized.")]
    Unauthorized,
}
