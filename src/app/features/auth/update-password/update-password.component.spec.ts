import { beforeEach, describe, expect, it } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { UpdatePasswordComponent } from './update-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('UpdatePasswordComponent', () => {
  let component: UpdatePasswordComponent;
  let fixture: ComponentFixture<UpdatePasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        UpdatePasswordComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule
      ],
      providers: [
        { provide: AuthService, useValue: { updatePassword: () => Promise.resolve({ success: true }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdatePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with password and confirmPassword controls', () => {
    expect(component.updatePasswordForm.contains('password')).toBeTruthy();
    expect(component.updatePasswordForm.contains('confirmPassword')).toBeTruthy();
  });

  it('should validate password match', () => {
    const password = component.updatePasswordForm.get('password');
    const confirmPassword = component.updatePasswordForm.get('confirmPassword');

    password?.setValue('password123');
    confirmPassword?.setValue('different123');
    
    expect(component.updatePasswordForm.errors?.['passwordMismatch']).toBeTruthy();
    
    confirmPassword?.setValue('password123');
    expect(component.updatePasswordForm.errors).toBeNull();
  });

  it('should require minimum length for password', () => {
    const password = component.updatePasswordForm.get('password');
    password?.setValue('short');
    expect(password?.valid).toBeFalsy();
    
    password?.setValue('longenough123');
    expect(password?.valid).toBeTruthy();
  });
});
