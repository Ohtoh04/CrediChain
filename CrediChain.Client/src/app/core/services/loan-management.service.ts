import { inject, Injectable } from '@angular/core';
import { CreateLoanRequest, Loan, User } from '../models/loans';
import { delay, from, Observable, of, tap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import idl from '@assets/idl/credichain.json';
import { Buffer } from 'buffer';
import { PhantomWalletService } from './phantom-wallet.service';
import { BN } from '@coral-xyz/anchor';

@Injectable({
  providedIn: 'root',
})
export class LoanManagementService {
  private connection = new Connection("https://api.devnet.solana.com");
  private walletService = inject(PhantomWalletService);
  private provider = new anchor.AnchorProvider(
    this.connection,
    {} as any,
    anchor.AnchorProvider.defaultOptions()
  );

  private program = new anchor.Program(
    idl as anchor.Idl,
    this.provider
  );

  private readonly httpClient = inject(HttpClient);

  getLoanDetails(loanId: string): Observable<Loan | undefined> {
    return from(
      (async () => {
        try {
          const loanPubkey = new PublicKey(loanId);
          const loanAccount = await (this.program.account as any)['Loan'].fetch(loanPubkey);

          // Normalize account data
          const borrower = {
            publicKey: loanAccount.borrower.toBase58(),
            reputationScore: 0, // Placeholder; you can fetch actual user reputation
          } as User;

          const investors: User[] = (loanAccount.lenders || []).map((pk: any) => ({
            publicKey: new PublicKey(pk).toBase58(),
            reputationScore: 0,
          }));

          return this.mapAnchorLoanToModel(loanAccount, borrower, investors, loanId);
        } catch (err) {
          console.error('Failed to fetch loan:', loanId, err);
          return undefined;
        }
      })()
    );
  }

  getLoans(
    userPublicKey: string,
    loansType: 'borrowed' | 'invested' | 'all' = 'all'
  ): Observable<any[]> {

    return from((async () => {
      const userPk = new PublicKey(userPublicKey);
      const allLoans = await (this.program.account as any)['loan'].all();

      // Normalize all pubkeys
      const normalizedLoans = allLoans.map((l: any) => ({
        ...l,
        account: {
          ...l.account,
          borrower: new PublicKey(l.account.borrower),
          lenders: l.account.lenders.map((pk: any) => new PublicKey(pk)),
        }
      }));

      if (loansType === 'borrowed') {
        return normalizedLoans.filter((l: any) =>
          l.account.borrower.toBase58() === userPk.toBase58()
        );
      }

      if (loansType === 'invested') {
        return normalizedLoans.filter((l: any) =>
          l.account.lenders.some((pk: any) => pk.toBase58() === userPk.toBase58())
        );
      }

    })());
  }

  getInvestedLoans(userPublicKey: string): Observable<Loan[]> {
    return from((async () => {
      const userPk = new PublicKey(userPublicKey);
      const allLoans = await (this.program.account as any)['loan'].all();

      return allLoans.filter((l: any) =>
        l.account.lenders.some((pk: any) => pk.toBase58() === userPk.toBase58())
      );
    })());
  }

createLoan(loanData: CreateLoanRequest): Observable<Loan> {
  return from(
    (async () => {
      if (!this.walletService.publicKey()) {
        throw new Error('Wallet not connected');
      }

      const loanKeypair = Keypair.generate();

      const [escrowPda, escrowBump] = await PublicKey.findProgramAddress(
        [Buffer.from('escrow'), loanKeypair.publicKey.toBuffer()],
        this.program.programId
      );


      const totalAmount = new BN(loanData.amount);
      const interestBps = new BN(Math.floor(loanData.interestRate * 100));
      const durationSeconds = new BN(loanData.durationDays * 24 * 60 * 60);

      await (this.program.methods as any)
        .createLoan(totalAmount, interestBps, durationSeconds)
        .accounts({
          loan: loanKeypair.publicKey,
          escrow: escrowPda,
          borrower: this.walletService.publicKey(),
          systemProgram: SystemProgram.programId,
        })
        .signers([loanKeypair])
        .rpc();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + loanData.durationDays);

      const newLoan: Loan = {
        id: loanKeypair.publicKey.toBase58(),
        borrower: loanData.borrower,
        amount: loanData.amount,
        fundedAmount: 0,
        interestRate: loanData.interestRate,
        durationDays: loanData.durationDays,
        status: 'OPEN',
        collateral: loanData.collateral,
        createdAt: new Date(),
        dueDate,
        investors: [],
      };

      console.log('Loan created successfully on-chain:', newLoan);

      return newLoan;
    })()
  );
}

    private mapAnchorLoanToModel(
    account: any,
    borrower: User,
    investors: User[],
    id: string
  ): Loan {
    const now = new Date();
    const createdAt = new Date((account.start_ts || now.getTime() / 1000) * 1000);
    const dueDate = new Date((account.due_ts || now.getTime() / 1000) * 1000);

    const statusMap: Record<string, Loan['status']> = {
      Open: 'OPEN',
      Funded: 'FUNDED',
      Repaid: 'REPAID',
    };

    const status = statusMap[account.status?.[0] ?? 'Open'] ?? 'OPEN';

    return {
      id,
      borrower,
      investors,
      amount: account.total_amount,
      fundedAmount: account.funded_amount,
      interestRate: account.interest_bps / 100,
      durationDays: Math.ceil(account.duration / (24 * 3600)),
      status,
      collateral: undefined,
      createdAt,
      dueDate,
    };
  }
}
