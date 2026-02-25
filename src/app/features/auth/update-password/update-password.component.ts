import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-update-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './update-password.component.html',
  styleUrl: './update-password.component.css'
})
export class UpdatePasswordComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  updatePasswordForm!: FormGroup;
  submitted = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPasswordField = signal(false);
  showConfirmPasswordField = signal(false);

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize the update password form with password and confirmPassword controls.
   */
  private initializeForm(): void {
    this.updatePasswordForm = this.formBuilder.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  /**
   * Custom validator to check if passwords match.
   */
  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword?.errors) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  }

  /**
   * Update password via Supabase.
   * Uses the recovery token from the reset email link.
   * Flow:
   * 1. Validate form
   * 2. Call auth service to update password
   * 3. Show success message
   * 4. Redirect to login
   */
  async updatePassword(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.updatePasswordForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.updatePasswordForm.disable();

    const { password } = this.updatePasswordForm.value;

    try {
      console.log('[UpdatePasswordComponent] Updating password...');

      const result = await this.authService.updatePassword(password);

      if (result.success) {
        console.log('[UpdatePasswordComponent] Password updated successfully');
        this.successMessage.set('Your password has been updated successfully!');
        this.updatePasswordForm.reset();
        this.submitted.set(false);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      } else {
        console.error('[UpdatePasswordComponent] Failed to update password:', result.error);
        this.errorMessage.set(result.error || 'Failed to update password. Please try again.');
        this.updatePasswordForm.enable();
      }
    } catch (error: any) {
      console.error('[UpdatePasswordComponent] Exception:', error);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
      this.updatePasswordForm.enable();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Toggle password field visibility.
   */
  togglePasswordVisibility(): void {
    this.showPasswordField.set(!this.showPasswordField());
  }

  /**
   * Toggle confirm password field visibility.
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPasswordField.set(!this.showConfirmPasswordField());
  }

  /**
   * Convenience getter for password control validation.
   */
  get password() {
    return this.updatePasswordForm.get('password');
  }

  /**
   * Convenience getter for confirmPassword control validation.
   */
  get confirmPassword() {
    return this.updatePasswordForm.get('confirmPassword');
  }
}
