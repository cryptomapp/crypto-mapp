use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;

declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

impl From<ErrorCode> for ProgramError {
    fn from(e: ErrorCode) -> ProgramError {
        ProgramError::Custom(e as u32)
    }
}

#[program]
pub mod crypto_mapp {
    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;

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

#[error_code]
pub enum ErrorCode {
    #[msg("The specified user does not exist.")]
    UserDoesNotExist,
    #[msg("The specified user already exists.")]
    UserAlreadyExists,
    #[msg("The specified referrer does not exist.")]
    ReferrerDoesNotExist,
}
