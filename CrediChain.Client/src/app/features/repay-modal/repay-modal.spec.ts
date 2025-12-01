import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundModal } from './repay-modal';

describe('FundModal', () => {
  let component: FundModal;
  let fixture: ComponentFixture<FundModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FundModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FundModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
