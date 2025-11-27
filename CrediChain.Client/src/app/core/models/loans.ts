export interface User {
  publicKey: string;
  reputationScore: number;
}

export interface Loan {
  id: string;
  borrower: User;
  amount: number;
  interestRate: number;
  durationDays: number;
  fundedAmount: number;
  status: 'OPEN' | 'FUNDED' | 'REPAID' | 'DEFAULTED';
  collateral?: string;
  createdAt: Date;
  dueDate: Date;
  investors?: User[];
}

export interface CreateLoanRequest {
  amount: number;
  interestRate: number;
  durationDays: number;
  collateral?: string;
  borrower: User;
}
