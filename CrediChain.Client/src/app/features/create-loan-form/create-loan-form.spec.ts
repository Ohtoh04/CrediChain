import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateLoanForm } from './create-loan-form';

describe('CreateLoanForm', () => {
  let component: CreateLoanForm;
  let fixture: ComponentFixture<CreateLoanForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateLoanForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateLoanForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
