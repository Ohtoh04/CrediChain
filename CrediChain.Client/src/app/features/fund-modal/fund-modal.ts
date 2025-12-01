import { Component, inject } from '@angular/core';
import { PhantomWalletService } from 'app/core/services/phantom-wallet.service';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TruncatePipe } from 'app/core/pipes/truncate-pipe';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Loan } from 'app/core/models/loans';
import { LoanManagementService } from 'app/core/services/loan-management.service';
import { PublicKey } from '@solana/web3.js';

export interface FundLoanDialogData {
  loan: Loan;
  availableAmount: number;
}

@Component({
  selector: 'app-fund-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TruncatePipe
  ],
  templateUrl: './fund-modal.html',
  styleUrl: './fund-modal.scss',
})
export class FundModal {
  private dialogRef = inject(MatDialogRef<FundModal>);
  private walletService = inject(PhantomWalletService);
  private loanService = inject(LoanManagementService);
  public data = inject<FundLoanDialogData>(MAT_DIALOG_DATA);

  amountControl = new FormControl(0, [
    Validators.required,
    Validators.min(0.1),
    Validators.max(this.data.availableAmount)
  ]);

  funding = false;
  publicKey = this.walletService.publicKey;
  walletBalance = 25.5; // Mock balance

  ngOnInit() {
    // Set default amount to available amount
    this.amountControl.setValue(this.data.availableAmount);
  }

  calculateExpectedReturn(amount: number): string {
    const interest = amount * (this.data.loan.interestRate / 100) * (this.data.loan.durationDays / 365);
    return (amount + interest).toFixed(2);
  }

  calculateInterest(amount: number): string {
    const interest = amount * (this.data.loan.interestRate / 100) * (this.data.loan.durationDays / 365);
    return interest.toFixed(2);
  }

  async onFund() {
    if (this.amountControl.valid && this.amountControl.value) {
      this.funding = true;
      await this.loanService.fundLoan(new PublicKey(this.data.loan.borrower.publicKey), this.data.loan.id, this.amountControl.value);
    }
  }

  onCancel() {
    this.dialogRef.close({ success: false });
  }
}