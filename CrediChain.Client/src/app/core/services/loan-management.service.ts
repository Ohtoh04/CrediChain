import { inject, Injectable } from '@angular/core';
import { CreateLoanRequest, Loan, User } from '../models/loans';
import { delay, from, Observable, of, tap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import idl from '@assets/idl/credichain.json';
import { Buffer } from 'buffer';
import { PhantomWalletService } from './phantom-wallet.service';
import { BN, Program } from '@coral-xyz/anchor';
import { T } from '@angular/cdk/keycodes';

export const LAMPORTS_PER_SOL = 1_000_000_000;


@Injectable({
  providedIn: 'root',
})
export class LoanManagementService {
  private connection = new Connection("http://127.0.0.1:8899");
  private walletService = inject(PhantomWalletService);
  private provider = new anchor.AnchorProvider(
    this.connection,
    this.walletService.getWallet(),
    anchor.AnchorProvider.defaultOptions()
  );

  private program = new anchor.Program(
    idl as anchor.Idl,
    this.provider
  );

  getProvider() {
    return new anchor.AnchorProvider(
      this.connection,
      this.walletService.getWallet(),
      anchor.AnchorProvider.defaultOptions()
    );
  }

  private getProgram() {
    return new anchor.Program(
      idl as anchor.Idl,
      this.getProvider()
    );
  }


  getLoanDetails(id: string): Observable<Loan | undefined> {
    return from(
      (async () => {
        try {

          // Note: Anchor account names are lowercase by convention ("loan", not "Loan")
          const loanAccount = await (this.program.account as any)['loan'].fetch(id);

          // Build borrower User object
          const borrower: User = {
            publicKey: new PublicKey(loanAccount.borrower).toString(),
            reputationScore: 50, // Placeholder; upgrade if you have real scoring
          };

          // Build investor list
          const investors: User[] = (loanAccount.lenders || []).map(
            (pk: any) => ({
              publicKey: new PublicKey(pk),
              reputationScore: 50,
            })
          );

          // Use the unified mapper
          return this.mapAnchorLoanToModel(
            loanAccount,
            borrower,
            investors,
            id
          );
        } catch (err) {
          console.error('Failed to fetch loan:', id, err);
          return undefined;
        }
      })()
    );
  }


  getLoans(
    userPublicKey: string,
    loansType: 'borrowed' | 'invested' | 'all' = 'all'
  ): Observable<Loan[]> {

    return from((async () => {
      const userPk = new PublicKey(userPublicKey);

      const allLoans = await (this.program.account as any)['loan'].all();

      const normalizedLoans: Loan[] = allLoans.map((l: any) => {
        const account = l.account ?? l;

        // Build borrower model
        const borrower: User = {
          publicKey: new PublicKey(account.borrower).toString(),
          reputationScore: 50
        };

        // Build investors list
        const investors: User[] = account.lenders.map((pk: any) => ({
          publicKey: new PublicKey(pk),
          reputationScore: 50
        }));

        return this.mapAnchorLoanToModel(
          account,
          borrower,
          investors,
          l.publicKey.toBase58()
        );
      });

      if (loansType === 'borrowed') {
        return normalizedLoans.filter(l =>
          l.borrower.publicKey === userPk.toString()
        );
      }

      if (loansType === 'invested') {
        return normalizedLoans.filter(l =>
          l.investors?.some(inv => inv.publicKey === userPk.toString())
        );
      }

      return normalizedLoans;
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

  createLoan(loanData: CreateLoanRequest): Observable<void> {
    return from((async () => {
      const program = this.getProgram();
      const borrowerPk = this.walletService.publicKey()!;

      const loanId = Date.now(); 

      // Derive loan PDA
      const [loanPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), borrowerPk.toBuffer(), Buffer.from(loanId.toString())],
        program.programId
      );

      // Derive escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), loanPda.toBuffer()],
        program.programId
      );

      const totalAmount = new BN(loanData.amount);
      const interestBps = new BN(Math.floor(loanData.interestRate));
      const durationSeconds = new BN(loanData.durationDays * 24 * 60 * 60);

      await (program.methods as any).createLoan(loanId, totalAmount, interestBps, durationSeconds)
        .accounts({
          loan: loanPda,
          escrow: escrowPda,
          borrower: borrowerPk,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    })());
  }

  async fundLoan(borrowerPk: PublicKey, loanKey: string, amount: number) {
    const program = this.getProgram();

    // Derive loan PDA
    const [loanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("loan"), borrowerPk.toBuffer(), Buffer.from(loanKey.toString())],
      program.programId
    );

    // Derive escrow PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), loanPda.toBuffer()],
      program.programId
    );

    await (program.methods as any).fundLoan(new BN(amount))
      .accounts({
        loan: loanPda,
        escrow: escrowPda,
        lender: this.walletService.publicKey()!,
        borrower: borrowerPk,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  private mapAnchorLoanToModel(
    account: any,
    borrower: User,
    investors: User[],
    id: string
  ): Loan {
    const createdAt = new Date(account.startTs.toNumber() * 1000);
    const dueDate = new Date(account.dueTs.toNumber() * 1000);

    const status = Object.keys(account.status)[0].toUpperCase() as Loan['status'];

    return {
      id,
      borrower,
      investors,
      amount: account.totalAmount.toNumber(),
      fundedAmount: typeof account.fundedAmount === 'string'
        ? parseInt(account.fundedAmount, 16)
        : account.fundedAmount.toNumber(),
      interestRate: account.interestBps,  // same as getLoans
      durationDays: account.duration / 86400,
      status,
      collateral: undefined,
      createdAt,
      dueDate,
    };
  }

}
