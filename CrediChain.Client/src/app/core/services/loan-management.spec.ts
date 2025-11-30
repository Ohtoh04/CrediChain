import { TestBed } from '@angular/core/testing';

import { LoanManagementService } from './loan-management.service';

describe('LoanManagementService', () => {
  let service: LoanManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
