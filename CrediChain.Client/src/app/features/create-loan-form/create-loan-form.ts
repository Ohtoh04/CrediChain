import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PublicKey } from '@solana/web3.js';
import { LoanManagementService } from 'app/core/services/loan-management.service';
import { PhantomWalletService } from 'app/core/services/phantom-wallet.service';

@Component({
  selector: 'app-create-loan-form',
  imports: [
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './create-loan-form.html',
  styleUrl: './create-loan-form.scss',
})
export class CreateLoanForm {
  private readonly walletService = inject(PhantomWalletService);
  private readonly loanManagementService = inject(LoanManagementService);
  private readonly snackBar = inject(MatSnackBar);
  
  error = signal<string | null>(null);
  publicKey: PublicKey | null = new PublicKey('11111111111111111111111111111111');
  loanForm: FormGroup;
  creatingLoan = false;

  private fb = inject(FormBuilder);

  constructor() {
    this.loanForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.1)]],
      interestRate: ['', [Validators.required, Validators.min(1), Validators.max(50)]],
      durationDays: ['', [Validators.required, Validators.min(7), Validators.max(365)]],
      collateral: [''],
    });
  }

  async createLoan() {
    if (!this.publicKey || !this.loanForm.valid) return;

    this.creatingLoan = true;
    this.error.set(null);

    try {
      const loanRequest = {
        amount: this.loanForm.value.amount,
        interestRate: this.loanForm.value.interestRate,
        durationDays: this.loanForm.value.durationDays,
        collateral: this.loanForm.value.collateral,
        borrower: {
          publicKey: this.publicKey.toString(),
          reputationScore: 85
        }
      };

      this.loanManagementService.createLoan(loanRequest).subscribe({
        next: (createdLoan) => {
          console.log('Loan created successfully:', createdLoan);
          this.resetForm();
          
          this.snackBar.open('Loan created successfully! 🎉', 'Close', { 
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error creating loan:', error);
          this.error.set('Failed to create loan');
          
          this.snackBar.open('Failed to create loan. Please try again.', 'Close', { 
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });

    } catch (error) {
      console.error('Error creating loan:', error);
      this.error.set('Failed to create loan');
      
      this.snackBar.open('Unexpected error occurred.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.creatingLoan = false;
    }
  }

  resetForm() {
    this.loanForm.reset();
    this.loanForm.markAsPristine();
    this.loanForm.markAsUntouched();
  }
}