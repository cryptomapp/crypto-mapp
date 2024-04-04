use crate::{ErrorCode, ProgramState, User};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn execute_transaction(ctx: Context<ExecuteTransaction>, amount: u64) -> ProgramResult {
    const MIN_TRANSACTION_AMOUNT: u64 = 10_000; // 0.01 USDC
    let fee_percentage = ctx.accounts.state.transaction_fee_percentage as u64; // Cast to u64 for calculation

    // Validate minimum transaction amount
    if amount < MIN_TRANSACTION_AMOUNT {
        return Err(ErrorCode::TransactionAmountTooLow.into());
    }

    // Calculate fee based on a percentage stored in state
    let fee = amount * fee_percentage / 10_000; // Convert basis points to percentage
    let transfer_amount = amount
        .checked_sub(fee)
        .ok_or(ErrorCode::InsufficientFunds)?;

    // Perform the transfer to the receiver
    let transfer_to_receiver_cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.sender_usdc_account.to_account_info(),
            to: ctx.accounts.receiver_usdc_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        },
    );
    token::transfer(transfer_to_receiver_cpi_ctx, transfer_amount)?;

    // Transfer the fee to the DAO account
    let transfer_to_dao_cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.sender_usdc_account.to_account_info(),
            to: ctx.accounts.dao_usdc_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        },
    );
    token::transfer(transfer_to_dao_cpi_ctx, fee)?;

    // Assuming transaction is successful, award EXP points to both sender and receiver
    ctx.accounts.sender_user_account.exp_points += 10;
    ctx.accounts.receiver_user_account.exp_points += 10;

    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut, constraint = sender_usdc_account.mint == state.usdc_mint @ ErrorCode::InvalidTokenAccount)]
    pub sender_usdc_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = receiver_usdc_account.mint == state.usdc_mint @ ErrorCode::InvalidTokenAccount)]
    pub receiver_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub dao_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub state: Account<'info, ProgramState>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub sender_user_account: Account<'info, User>,
    #[account(mut)]
    pub receiver_user_account: Account<'info, User>,
}
