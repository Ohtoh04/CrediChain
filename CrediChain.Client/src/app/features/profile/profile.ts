import { Component, inject, OnInit, signal } from '@angular/core';
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

  publicKey: PublicKey | null = new PublicKey('11111111111111111111111111111111');
  error = signal<string | null>(null);

  borrowedLoans = signal<Loan[]>([]);
  investedLoans = signal<Loan[]>([]);

  ngOnInit(): void {
    this.loadBorrowedLoans();
    this.loadInvestedLoans();
  }

  async connectWallet() {
    this.error.set(null);
    try {
      this.publicKey = (await this.walletService.connect())();
    } catch (err: any) {
      this.error.set(err.message || 'Failed to connect');
    }
  }

  async disconnectWallet() {
    await this.walletService.disconnect();
    this.publicKey = null;
  }

  private loadBorrowedLoans() {
    if (!this.publicKey) return;

    this.loanManagementService.getLoansMock(this.publicKey.toString(), 'borrowed').subscribe({
      next: (res) => this.borrowedLoans.set(res),
      error: (_) => this.error.set(`Failed loading loans`),
    });
  }

  private loadInvestedLoans() {
    if (!this.publicKey) return;

    this.loanManagementService.getLoansMock(this.publicKey.toString(), 'invested').subscribe({
      next: (res) => this.investedLoans.set(res),
      error: (_) => this.error.set(`Failed loading loans`),
    });
  }
}
