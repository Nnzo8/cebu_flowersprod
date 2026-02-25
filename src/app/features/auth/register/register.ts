import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm!: FormGroup;
  submitted = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showConfirmationMessage = signal(false);
  registeredEmail = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
  }

  // Terms and Conditions modal state
  isTermsModalOpen = signal(false);

  /**
   * Initialize the register form with fullName, email, password, and agreedToTerms controls.
   */
  private initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      agreedToTerms: [false, Validators.requiredTrue]
    });
  }

  /**
   * Open the Terms and Conditions modal.
   */
  openTerms(): void {
    this.isTermsModalOpen.set(true);
  }

  /**
   * Close the Terms and Conditions modal.
   */
  closeTerms(): void {
    this.isTermsModalOpen.set(false);
  }

  /**
   * Handle form submission with Supabase email verification.
   * Flow:
   * 1. Validate form
   * 2. Send registration to Supabase with email confirmation
   * 3. Show confirmation message asking user to check email
   * 4. Once email is validated, user is officially registered
   */
  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    // Disable form during submission
    this.registerForm.disable();

    const { fullName, email, password } = this.registerForm.value;

    try {
      console.log('[RegisterComponent] Starting registration for:', email);
      
      // Call auth service to register user
      const result = await this.authService.register(
        email,
        password,
        fullName
      );

      if (result.success) {
        console.log('[RegisterComponent] Registration successful for:', email);
        
        // Show confirmation message instead of immediate redirect
        this.registeredEmail.set(email);
        this.showConfirmationMessage.set(true);
        
        // Reset form
        this.registerForm.reset();
        this.submitted.set(false);

        // Optional: Auto-redirect to login after 10 seconds
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 10000);
      } else {
        console.error('[RegisterComponent] Registration failed:', result.error);
        // Handle specific Supabase error messages
        if (result.error?.includes('already registered')) {
          this.errorMessage.set('This email is already registered. Please log in or use a different email.');
        } else if (result.error?.includes('password')) {
          this.errorMessage.set('Password does not meet security requirements. Use at least 8 characters.');
        } else {
          this.errorMessage.set(result.error || 'Registration failed. Please try again.');
        }
        // Re-enable form on error
        this.registerForm.enable();
      }
    } catch (error: any) {
      console.error('[RegisterComponent] Registration exception:', error);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
      // Re-enable form on error
      this.registerForm.enable();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Dismiss error message
   */
  dismissError(): void {
    this.errorMessage.set(null);
  }

  /**
   * Dismiss confirmation and redirect to login
   */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Convenience getter for fullName control validation.
   */
  get fullName() {
    return this.registerForm.get('fullName');
  }

  /**
   * Convenience getter for email control validation.
   */
  get email() {
    return this.registerForm.get('email');
  }

  /**
   * Convenience getter for password control validation.
   */
  get password() {
    return this.registerForm.get('password');
  }

  /**
   * Convenience getter for agreedToTerms control validation.
   */
  get agreedToTerms() {
    return this.registerForm.get('agreedToTerms');
  }
}
