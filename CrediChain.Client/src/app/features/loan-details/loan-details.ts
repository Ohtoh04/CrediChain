import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Loan } from 'app/core/models/loans';
import { LoanManagementService } from 'app/core/services/loan-management.service';
import { PhantomWalletService } from 'app/core/services/phantom-wallet.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { TruncatePipe } from 'app/core/pipes/truncate-pipe';

@Component({
  selector: 'app-loan-details',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, DatePipe, TruncatePipe],
  templateUrl: './loan-details.html',
  styleUrl: './loan-details.scss',
})
export class LoanDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loanService = inject(LoanManagementService);
  private walletService = inject(PhantomWalletService);

  loan = signal<Loan | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadLoanDetails();
  }

  loadLoanDetails() {
    const loanId = this.route.snapshot.paramMap.get('id');

    if (!loanId) {
      this.error.set('Loan ID not provided');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.loanService.getLoanDetails(loanId).subscribe({
      next: (loan) => {
        this.loan.set(loan || null);
        if (!loan) {
          this.error.set('Loan not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load loan details');
        this.loading.set(false);
        console.error('Error loading loan:', err);
      },
    });
  }

  isBorrower(): boolean {
    const currentUser = this.walletService.publicKey();
    return this.loan()?.borrower.publicKey === currentUser?.toString();
  }

  fundLoan(loanId: string) {
    // TODO: Implement fund loan logic
    console.log('Funding loan:', loanId);
  }

  repayLoan(loanId: string) {
    // TODO: Implement repay loan logic
    console.log('Repaying loan:', loanId);
  }

  goBack() {
    this.router.navigate(['/loans']);
  }
}
