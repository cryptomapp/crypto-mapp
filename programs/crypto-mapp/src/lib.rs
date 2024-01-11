use anchor_lang::prelude::*;

declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

#[program]
pub mod crypto_mapp {
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    use super::*;

    // Initialize a new user with EXP points
    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        referrer: Option<Pubkey>,
    ) -> ProgramResult {
        let user_exp_account = &mut ctx.accounts.user_exp;

        if user_exp_account.exp_points == 0 && user_exp_account.is_new {
            user_exp_account.exp_points = 100; // Starting EXP points
            user_exp_account.is_new = false;

            if let Some(referrer_pubkey) = referrer {
                if referrer_pubkey != ctx.accounts.user.key() {
                    if ctx.accounts.referrer_exp.is_some() {
                        let referrer_exp_account = &mut ctx.accounts.referrer_exp.clone().unwrap();
                        referrer_exp_account.exp_points += 50; // Bonus EXP for the referrer
                        user_exp_account.exp_points += 50; // Bonus EXP for the user
                    }
                }
            }
        }

        Ok(())
    }

    // Function to get a user's EXP
    pub fn get_user_exp(ctx: Context<GetUserExp>) -> ProgramResult {
        let user_exp_account = &ctx.accounts.user_exp;
        msg!("User EXP: {}", user_exp_account.exp_points);
        Ok(())
    }
}

// Define the context for initializing a user
#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1 + 4)]
    pub user_exp: Account<'info, UserExp>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub referrer_exp: Option<Account<'info, UserExp>>,
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
    pub is_new: bool,
}

// Define error codes for the program
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized action.")]
    Unauthorized,
}
