use anchor_lang::prelude::*;

declare_id!("FxkNMBmmmF6phc5uUYKzrbmN9SVU6C7cKZi94zoKQRuL");

pub const MAX_LENDERS: usize = 32;

#[program]
pub mod credichain {
    use super::*;

    pub fn create_loan(
        ctx: Context<CreateLoan>,
        total_amount: u64,
        interest_bps: u16,
        duration_seconds: i64,
    ) -> Result<()> {
        require!(total_amount > 0, LoanError::InvalidAmount);
        require!(interest_bps <= 10_000, LoanError::InvalidAmount);

        let loan = &mut ctx.accounts.loan;

        loan.borrower = ctx.accounts.borrower.key();
        loan.total_amount = total_amount;
        loan.funded_amount = 0;
        loan.interest_bps = interest_bps;
        loan.duration = duration_seconds;
        loan.status = LoanStatus::Open;

        loan.lenders = Vec::new();
        loan.lenders_amounts = Vec::new();

        loan.start_ts = 0;
        loan.due_ts = 0;
        loan.repaid_ts = 0;

        loan.escrow_bump = ctx.bumps.escrow;

        Ok(())
    }

    pub fn fund_loan<'info>(
        ctx: Context<'_, '_, 'info, 'info, FundLoan<'info>>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, LoanError::InvalidAmount);

        let loan = &mut ctx.accounts.loan;
        require!(loan.status == LoanStatus::Open, LoanError::InvalidStatus);

        let remaining_needed = loan.total_amount - loan.funded_amount;
        let contribute_amount = amount.min(remaining_needed);
        require!(contribute_amount > 0, LoanError::InvalidAmount);

        let lender = ctx.accounts.lender.key();
        require!(lender != loan.borrower, LoanError::SelfFunding);

        // Transfer lender → escrow via CPI
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.lender.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_lang::system_program::transfer(cpi_ctx, contribute_amount)?;

        // Update lender table
        if let Some(i) = loan.lenders.iter().position(|k| k == &lender) {
            loan.lenders_amounts[i] += contribute_amount;
        } else {
            require!(loan.lenders.len() < MAX_LENDERS, LoanError::TooManyLenders);
            loan.lenders.push(lender);
            loan.lenders_amounts.push(contribute_amount);
        }

        loan.funded_amount += contribute_amount;

        // If fully funded → activate and disburse to borrower
        if loan.funded_amount == loan.total_amount {
            loan.status = LoanStatus::Funded;
            let now = Clock::get()?.unix_timestamp;
            loan.start_ts = now;
            loan.due_ts = now + loan.duration;

            // Disburse loan amount from escrow to borrower
            **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= loan.total_amount;
            **ctx.accounts.borrower.to_account_info().try_borrow_mut_lamports()? += loan.total_amount;
        }

        Ok(())
    }

    pub fn repay_loan<'info>(
        ctx: Context<'_, '_, 'info, 'info, RepayLoan<'info>>,
        repay_amount: u64,
    ) -> Result<()> {
        require!(repay_amount > 0, LoanError::InvalidAmount);

        let loan = &mut ctx.accounts.loan;
        require!(loan.status == LoanStatus::Funded, LoanError::InvalidStatus);

        // Calculate required repayment
        let interest = loan.total_amount * loan.interest_bps as u64 / 10_000;
        let expected_total = loan.total_amount + interest;
        require!(repay_amount >= expected_total, LoanError::InsufficientRepayment);

        // Borrower transfers repay → escrow via CPI
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.borrower.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program.clone(), cpi_accounts);
        anchor_lang::system_program::transfer(cpi_ctx, repay_amount)?;

        let total_funded = loan.funded_amount as u128;
        let now = Clock::get()?.unix_timestamp;

        // Clone lenders data to avoid borrowing issues
        let lenders = loan.lenders.clone();
        let lenders_amounts = loan.lenders_amounts.clone();

        // Distribute repayment to lenders
        for (i, lender_pk) in lenders.iter().enumerate() {
            let share = (repay_amount as u128 * lenders_amounts[i] as u128) / total_funded;
            let share_u64 = share as u64;

            let lender_info = ctx.remaining_accounts[i].to_account_info();
            require!(lender_info.key == lender_pk, LoanError::MissingLenderAccount);

            // Transfer share from escrow to lender
            **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= share_u64;
            **lender_info.try_borrow_mut_lamports()? += share_u64;
        }

        // Reborrow loan for status update
        let loan = &mut ctx.accounts.loan;
        
        // Determine whether loan is repaid on time or late
        if now <= loan.due_ts {
            loan.status = LoanStatus::RepaidOnTime;
        } else {
            loan.status = LoanStatus::RepaidLate;
        }

        loan.repaid_ts = now;

        Ok(())
    }
}

#[account]
pub struct Escrow {}

#[account]
pub struct Loan {
    pub borrower: Pubkey,
    pub total_amount: u64,
    pub funded_amount: u64,
    pub interest_bps: u16,
    pub duration: i64,
    pub start_ts: i64,
    pub due_ts: i64,
    pub repaid_ts: i64,
    pub status: LoanStatus,
    pub lenders: Vec<Pubkey>,
    pub lenders_amounts: Vec<u64>,
    pub escrow_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LoanStatus {
    Open,
    Funded,
    RepaidOnTime,
    RepaidLate,
}

#[derive(Accounts)]
pub struct CreateLoan<'info> {
    #[account(init, payer = borrower, space = 8 + 500)]
    pub loan: Account<'info, Loan>,

    #[account(
        init,
        payer = borrower,
        seeds = [b"escrow", loan.key().as_ref()],
        bump,
        space = 8,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub borrower: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundLoan<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,

    #[account(
        mut,
        seeds = [b"escrow", loan.key().as_ref()],
        bump = loan.escrow_bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub lender: Signer<'info>,

    /// CHECK: Validated by address constraint
    #[account(mut, address = loan.borrower)]
    pub borrower: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub loan: Account<'info, Loan>,

    #[account(
        mut,
        seeds = [b"escrow", loan.key().as_ref()],
        bump = loan.escrow_bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut, address = loan.borrower)]
    pub borrower: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum LoanError {
    InvalidAmount,
    InvalidStatus,
    TooManyLenders,
    SelfFunding,
    InsufficientRepayment,
    MissingLenderAccount,
}