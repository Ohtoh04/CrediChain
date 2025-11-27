import { Routes } from '@angular/router';
import { LandingPage } from './features/landing-page/landing-page';
import { LoansList } from './features/loans-list/loans-list';
import { MyProfile } from './features/profile/profile';
import { CreateLoanForm } from './features/create-loan-form/create-loan-form';
import { LoanDetails } from './features/loan-details/loan-details';

export const routes: Routes = [
  {
    path: '',
    component: LandingPage,
  },
  {
    path: 'loans',
    component: LoansList,
  },
  {
    path: 'profile',
    component: MyProfile,
  },
  {
    path: 'create-loan-form',
    component: CreateLoanForm,
  },
  {
    path: 'loan/:id',
    component: LoanDetails,
  },
];
