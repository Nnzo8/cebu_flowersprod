import { beforeEach, describe, expect, it } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: AuthService, useValue: { sendPasswordResetLink: () => Promise.resolve({ success: true }) } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with email control', () => {
    expect(component.forgotPasswordForm.contains('email')).toBeTruthy();
  });

  it('should make the email control required', () => {
    const control = component.forgotPasswordForm.get('email');
    control?.setValue('');
    expect(control?.valid).toBeFalsy();
  });

  it('should validate email format', () => {
    const control = component.forgotPasswordForm.get('email');
    control?.setValue('invalid-email');
    expect(control?.valid).toBeFalsy();
    control?.setValue('test@example.com');
    expect(control?.valid).toBeTruthy();
  });
});
