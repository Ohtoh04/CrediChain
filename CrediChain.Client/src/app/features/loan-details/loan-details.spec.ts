import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanDetails } from './loan-details';

describe('LoanDetails', () => {
  let component: LoanDetails;
  let fixture: ComponentFixture<LoanDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
