import { TestBed } from '@angular/core/testing';

import { ReputationService } from './reputation.service';

describe('Reputation', () => {
  let service: ReputationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReputationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
