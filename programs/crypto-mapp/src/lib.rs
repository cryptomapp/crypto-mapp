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
    pub fn check_user_exists(ctx: Context<GetUserExp>) -> ProgramResult {
        let user_exp_account = &ctx.accounts.user_exp;
        msg!("User EXP Points: {}", user_exp_account.exp_points);
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

// Define the context for getting a user's EXP
#[derive(Accounts)]
pub struct GetUserExp<'info> {
    #[account(mut)]
    pub user_exp: Account<'info, UserExp>,
}

// Define the UserExp account structure
#[account]
pub struct UserExp {
    pub exp_points: u32,
}
