import { inject, Injectable } from '@angular/core';
import { CreateLoanRequest, Loan } from '../models/loans';
import { delay, Observable, of, tap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class LoanManagementService {
  private baseUrl = 'assets/mock-data/loans.json';

  private readonly httpClient = inject(HttpClient);

  getLoanDetails(loanId: string): Observable<Loan | undefined> {
    const mockLoans: Loan[] = [
      {
        id: '1',
        borrower: {
          publicKey: '7Z1P6zG7C8oF5dR2tY3uI9pL0qW4eS5xV6bN8mM2kK1jH3gF4d',
          reputationScore: 85,
        },
        amount: 10,
        interestRate: 5.5,
        durationDays: 30,
        fundedAmount: 8,
        status: 'OPEN',
        collateral: 'SOL tokens',
        createdAt: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        investors: [],
      },
      {
        id: '2',
        borrower: {
          publicKey: '7Z1P6zG7C8oF5dR2tY3uI9pL0qW4eS5xV6bN8mM2kK1jH3gF4d',
          reputationScore: 85,
        },
        amount: 25,
        interestRate: 7.2,
        durationDays: 60,
        fundedAmount: 25,
        status: 'FUNDED',
        collateral: 'NFT collection #123',
        createdAt: new Date('2024-01-10'),
        dueDate: new Date('2024-03-10'),
        investors: [
          { publicKey: 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0', reputationScore: 90 },
          { publicKey: 'Z9Y8X7W6V5U4T3S2R1Q0P9O8N7M6L5K4J3I2H1G0', reputationScore: 78 },
        ],
      },
      {
        id: '3',
        borrower: {
          publicKey: 'other_user_public_key_1234567890abcdef',
          reputationScore: 70,
        },
        amount: 15,
        interestRate: 6.0,
        durationDays: 45,
        fundedAmount: 12,
        status: 'OPEN',
        collateral: 'Real estate token',
        createdAt: new Date('2024-01-20'),
        dueDate: new Date('2024-03-05'),
        investors: [
          { publicKey: '7Z1P6zG7C8oF5dR2tY3uI9pL0qW4eS5xV6bN8mM2kK1jH3gF4d', reputationScore: 85 },
        ],
      },
      {
        id: '4',
        borrower: {
          publicKey: 'defaulted_user_9876543210zyxwv',
          reputationScore: 45,
        },
        amount: 50,
        interestRate: 12.5,
        durationDays: 90,
        fundedAmount: 50,
        status: 'DEFAULTED',
        collateral: 'Car title',
        createdAt: new Date('2023-11-01'),
        dueDate: new Date('2024-01-30'),
        investors: [
          { publicKey: 'investor_alpha_123456789', reputationScore: 92 },
          { publicKey: 'investor_beta_987654321', reputationScore: 88 },
        ],
      },
      {
        id: '5',
        borrower: {
          publicKey: 'repaid_user_abcdef123456',
          reputationScore: 95,
        },
        amount: 8,
        interestRate: 4.5,
        durationDays: 30,
        fundedAmount: 8,
        status: 'REPAID',
        collateral: 'Gold tokens',
        createdAt: new Date('2023-12-01'),
        dueDate: new Date('2023-12-31'),
        investors: [{ publicKey: 'trusted_investor_xyz789', reputationScore: 96 }],
      },
    ];

    const foundLoan = mockLoans.find((loan) => loan.id === loanId);

    return of(foundLoan).pipe(
      delay(800),
      tap((loan) => {
        if (loan) {
          console.log('Loan found:', loan.id);
        } else {
          console.log('Loan not found:', loanId);
        }
      })
    );

    // return this.httpClient.get<Loan>(`${this.baseUrl}/${loanId}`);
  }

  getLoans(
    userPublicKey: string,
    loansType: 'borrowed' | 'invested' | 'all' = 'all'
  ): Observable<Loan[]> {
    let requestParameters = new HttpParams()
      .set('userPublicKey', userPublicKey)
      .set('loansType', loansType);

    return this.httpClient.get<Loan[]>(this.baseUrl, {
      params: requestParameters,
    });
  }

  getInvestedLoans(userPublicKey: string): Observable<Loan[]> {
    return new Observable<Loan[]>((observer) => {
      this.httpClient.get<Loan[]>(this.baseUrl).subscribe((loans) => {
        const invested = loans.filter((l) =>
          l.investors?.some((inv) => inv.publicKey === userPublicKey)
        );
        observer.next(invested);
        observer.complete();
      });
    });
  }

  createLoan(loanData: CreateLoanRequest): Observable<Loan> {
    const mockLoan: Loan = {
      id: Math.random().toString(36).substr(2, 9),
      borrower: loanData.borrower,
      amount: loanData.amount,
      interestRate: loanData.interestRate,
      durationDays: loanData.durationDays,
      fundedAmount: 0,
      status: 'OPEN',
      collateral: loanData.collateral,
      createdAt: new Date(),
      dueDate: new Date(Date.now() + loanData.durationDays * 24 * 60 * 60 * 1000),
      investors: [],
    };

    return of(mockLoan).pipe(
      delay(1000),
      tap((loan) => console.log('Loan created successfully:', loan))
    );

    // return this.httpClient.post<Loan>(this.baseUrl, loanData);
  }

  getLoansMock(
    userPublicKey: string,
    loansType: 'borrowed' | 'invested' | 'all' = 'all'
  ): Observable<Loan[]> {
    const mockLoans: Loan[] = [
      {
        id: '1',
        borrower: { publicKey: userPublicKey, reputationScore: 85 },
        amount: 10,
        interestRate: 5.5,
        durationDays: 30,
        fundedAmount: 8,
        status: 'OPEN',
        collateral: 'SOL tokens',
        createdAt: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        investors: [],
      },
      {
        id: '2',
        borrower: { publicKey: userPublicKey, reputationScore: 85 },
        amount: 25,
        interestRate: 7.2,
        durationDays: 60,
        fundedAmount: 25,
        status: 'FUNDED',
        collateral: 'NFT collection',
        createdAt: new Date('2024-01-10'),
        dueDate: new Date('2024-03-10'),
        investors: [
          { publicKey: 'investor1', reputationScore: 90 },
          { publicKey: 'investor2', reputationScore: 78 },
        ],
      },
      {
        id: '3',
        borrower: { publicKey: 'other_user', reputationScore: 70 },
        amount: 15,
        interestRate: 6.0,
        durationDays: 45,
        fundedAmount: 12,
        status: 'OPEN',
        createdAt: new Date('2024-01-20'),
        dueDate: new Date('2024-03-05'),
        investors: [{ publicKey: userPublicKey, reputationScore: 85 }],
      },
    ];

    let filteredLoans: Loan[];

    switch (loansType) {
      case 'borrowed':
        filteredLoans = mockLoans.filter((l) => l.borrower.publicKey === userPublicKey);
        break;
      case 'invested':
        filteredLoans = mockLoans.filter((l) =>
          l.investors?.some((inv) => inv.publicKey === userPublicKey)
        );
        break;
      case 'all':
        filteredLoans = mockLoans.filter(
          (l) =>
            l.borrower.publicKey === userPublicKey ||
            l.investors?.some((inv) => inv.publicKey === userPublicKey)
        );
        break;
      default:
        filteredLoans = mockLoans;
    }

    return of(filteredLoans).pipe(delay(300));
  }
}
