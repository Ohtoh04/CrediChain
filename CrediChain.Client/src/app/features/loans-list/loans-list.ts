// loans-list.component.ts
import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { TruncatePipe } from 'app/core/pipes/truncate-pipe';
import { LoanManagementService } from 'app/core/services/loan-management.service';
import { PhantomWalletService } from 'app/core/services/phantom-wallet.service';
import { Loan } from 'app/core/models/loans';
import { DatePipe } from '@angular/common';
import { PublicKey } from '@solana/web3.js';
import { FundModal } from '../fund-modal/fund-modal';

@Component({
  selector: 'app-loans-list',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    TruncatePipe,
    RouterLink,
    DatePipe
  ],
  templateUrl: './loans-list.html',
  styleUrl: './loans-list.scss',
})
export class LoansList implements OnInit {
  private loanService = inject(LoanManagementService);
  private walletService = inject(PhantomWalletService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  loans = signal<Loan[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  
  statusFilter = new FormControl(['OPEN']);
  sortBy = new FormControl('newest');
  
  currentPage = 1;
  pageSize = 9;

  publicKey = this.walletService.publicKey;

  filteredLoans = computed(() => {
    let filtered = this.loans();
    
    const statusFilters = this.statusFilter.value;
    if (statusFilters && statusFilters.length > 0) {
      filtered = filtered.filter(loan => statusFilters.includes(loan.status));
    }
    
    const sort = this.sortBy.value;
    filtered = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount_high':
          return b.amount - a.amount;
        case 'amount_low':
          return a.amount - b.amount;
        case 'interest_high':
          return b.interestRate - a.interestRate;
        case 'interest_low':
          return a.interestRate - b.interestRate;
        default:
          return 0;
      }
    });
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  });

  totalPages = computed(() => {
    return Math.ceil(this.loans().length / this.pageSize);
  });

  constructor() {
    effect(() => {
      this.loadLoans();

    });
  }

  ngOnInit() {
    this.loadLoans();

    this.statusFilter.valueChanges.subscribe(() => {
      this.currentPage = 1;
    });
    
    this.sortBy.valueChanges.subscribe(() => {
      this.currentPage = 1;
    });
  }

  loadLoans() {
    if(!this.publicKey()) return;

    this.loading.set(true);
    this.error.set(null);

    this.loanService.getLoans(this.publicKey()!.toString()).subscribe({
      next: (loans) => {
        this.loans.set(loans);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load loans');
        this.loading.set(false);
        console.error('Error loading loans:', err);
      }
    });
  }

  fundLoan(loan: Loan) {
    const availableAmount = loan.amount - loan.fundedAmount;
    
    const dialogRef = this.dialog.open(FundModal, {
      width: '500px',
      data: { 
        loan,
        availableAmount
      }
    });
  }

  repayLoan(loan: Loan) {
    // TODO: Implement repay loan logic
    console.log('Repaying loan:', loan.id);
  }

  clearFilters() {
    this.statusFilter.setValue(['OPEN']);
    this.sortBy.setValue('newest');
    this.currentPage = 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}