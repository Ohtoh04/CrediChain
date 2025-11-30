import { TestBed } from '@angular/core/testing';

import { PhantomWalletService } from './phantom-wallet.service';

describe('PhantomWalletService', () => {
  let service: PhantomWalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhantomWalletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
