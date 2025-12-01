import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PhantomWalletService } from 'app/core/services/phantom-wallet.service';
import { PublicKey } from '@solana/web3.js';
import { LoanManagementService } from 'app/core/services/loan-management.service';
import { Loan } from 'app/core/models/loans';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [MatToolbarModule, MatCardModule, MatButtonModule, DatePipe, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class MyProfile implements OnInit {
  private readonly walletService = inject(PhantomWalletService);
  private readonly loanManagementService = inject(LoanManagementService);

  publicKey = this.walletService.publicKey;
  error = signal<string | null>(null);

  borrowedLoans = signal<Loan[]>([]);
  investedLoans = signal<Loan[]>([]);

  constructor() {
    effect(() => {
      this.loadBorrowedLoans();
      this.loadInvestedLoans();
    });
  }

  ngOnInit(): void {
      this.loadBorrowedLoans();
      this.loadInvestedLoans();
  }

  async connectWallet() {
    this.error.set(null);
    try {
      await this.walletService.connect();
    } catch (err: any) {
      this.error.set(err.message || 'Failed to connect');
    }
  }

  async disconnectWallet() {
    await this.walletService.disconnect();
  }

  private loadBorrowedLoans() {
    if (!this.publicKey()) return;

    this.loanManagementService.getLoans(this.publicKey()!.toString(), 'borrowed').subscribe({
      next: (res) => this.borrowedLoans.set(res),
      error: (error) => {
        console.log("Failed loading borrowed loans: ", error);
        this.error.set(`Failed loading loans`);
      },
    });
  }

  private loadInvestedLoans() {
    if (!this.publicKey()) return;

    this.loanManagementService.getLoans(this.publicKey()!.toString(), 'invested').subscribe({
      next: (res) => this.investedLoans.set(res),
      error: (error) => {
        console.log("Failed loading invested loans: ", error);
        this.error.set(`Failed loading loans`);
      },
    });
  }
}
