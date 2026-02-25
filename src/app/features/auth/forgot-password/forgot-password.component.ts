import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  forgotPasswordForm!: FormGroup;
  submitted = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize the forgot password form with email control.
   */
  private initializeForm(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  /**
   * Send password reset link via Supabase.
   * Flow:
   * 1. Validate form
   * 2. Call auth service to send reset link
   * 3. Show success message
   * 4. Clear any error messages
   */
  async sendResetLink(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.forgotPasswordForm.disable();

    const { email } = this.forgotPasswordForm.value;

    try {
      console.log('[ForgotPasswordComponent] Sending password reset link for:', email);

      const result = await this.authService.sendPasswordResetLink(email);

      if (result.success) {
        console.log('[ForgotPasswordComponent] Password reset link sent to:', email);
        this.successMessage.set('Check your email for the password reset link!');
        this.forgotPasswordForm.reset();
        this.submitted.set(false);
      } else {
        console.error('[ForgotPasswordComponent] Failed to send reset link:', result.error);
        this.errorMessage.set(result.error || 'Failed to send reset link. Please try again.');
        this.forgotPasswordForm.enable();
      }
    } catch (error: any) {
      console.error('[ForgotPasswordComponent] Exception:', error);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
      this.forgotPasswordForm.enable();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Clear the success message and return to login.
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Convenience getter for email control validation.
   */
  get email() {
    return this.forgotPasswordForm.get('email');
  }
}
