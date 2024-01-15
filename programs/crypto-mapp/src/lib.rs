use anchor_lang::prelude::*;

declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

#[program]
pub mod crypto_mapp {
    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    // Function to initialize a new user
    pub fn initialize_user(ctx: Context<InitializeUser>) -> ProgramResult {
        let user_exp_account = &mut ctx.accounts.user_exp;
        user_exp_account.exp_points = 100;
        Ok(())
    }

    // Function to initialize a new user with a referrer
    pub fn initialize_user_with_referrer(ctx: Context<InitializeUserWithReferrer>) -> Result<()> {
        let user_exp_account = &mut ctx.accounts.user_exp;
        user_exp_account.exp_points = 150; // New user gets 150 EXP

        let referrer_exp_account = &mut ctx.accounts.referrer_exp;
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
}

// Define the context for initializing a user
#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = user, space = 8 + 32 + 4, seeds = [user.key().as_ref()], bump)]
    pub user_exp: Account<'info, UserExp>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Define the context for initializing a user with a referrer
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

// Define the context for checking if a user exists
#[derive(Accounts)]
pub struct CheckUserExists<'info> {
    #[account(mut)]
    pub user_exp: Account<'info, UserExp>,
}

// Define the UserExp account structure
#[account]
pub struct UserExp {
    pub exp_points: u32,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The specified user does not exist.")]
    UserDoesNotExist,
}
