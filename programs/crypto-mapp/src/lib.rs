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
