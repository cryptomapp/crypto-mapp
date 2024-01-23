use crate::{ErrorCode, ProgramState, User};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

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
