import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoansList } from './loans-list';

describe('LoansList', () => {
  let component: LoansList;
  let fixture: ComponentFixture<LoansList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoansList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
