use anchor_lang::prelude::*;

declare_id!("2fN9ZMRnTB3MHi3oT3HFJcReY7jTJDDhoQNFKrbTKTTe");

#[account]
pub struct Merchant {
    pub owner: Pubkey,
    pub arweave_id: String,
}

#[account]
pub struct ProgramState {
    pub owner: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32)]
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateMerchant<'info> {
    /// CHECK: The state account is being initialized here and is safe because...
    #[account(init, payer = payer, space = 8 + 32 + 256)]
    pub merchant: Account<'info, Merchant>,
    /// CHECK: This account represents the user initializing the program and paying for the transaction. It's safe because...
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub state: Account<'info, ProgramState>,
}

#[program]
pub mod crypto_mapp {
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    use super::*; // Importing from the parent module

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        let state = &mut ctx.accounts.state;
        state.owner = *ctx.accounts.user.key;
        Ok(())
    }

    pub fn create_merchant(ctx: Context<CreateMerchant>, arweave_id: String) -> ProgramResult {
        if ctx.accounts.state.owner != *ctx.accounts.payer.key {
            // Explicitly referring to the local ErrorCode
            return Err(crate::ErrorCode::Unauthorized.into());
        }

        let merchant = &mut ctx.accounts.merchant;
        merchant.owner = *ctx.accounts.user.key;
        merchant.arweave_id = arweave_id;
        Ok(())
    }
}

// Define your custom ErrorCode within the same module
#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}

impl From<ErrorCode> for ProgramError {
    fn from(e: ErrorCode) -> Self {
        ProgramError::Custom(e as u32)
    }
}
