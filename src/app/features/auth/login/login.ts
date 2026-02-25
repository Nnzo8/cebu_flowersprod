import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize the login form with email and password controls.
   */
  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Handle form submission with Supabase authentication
   */
  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.errorMessage.set(null);

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    const { email, password } = this.loginForm.value;

    try {
      console.log('[LoginComponent] Attempting login for:', email);
      const result = await this.authService.login(email, password);
      console.log('[LoginComponent] Login result:', result);

      if (result.success) {
        // Give the session a moment to update before checking the user
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const user = this.authService.currentUser();
        console.log('[LoginComponent] Current user after login:', user);
        
        if (user?.role === 'admin') {
          console.log('[LoginComponent] User is admin, navigating to /admin/dashboard');
          this.router.navigate(['/admin/dashboard']);
        } else {
          console.log('[LoginComponent] User is not admin, navigating to /');
          this.router.navigate(['/']);
        }
      } else {
        console.log('[LoginComponent] Login failed with error:', result.error);
        this.errorMessage.set(result.error || 'Login failed. Please try again.');
        this.loginForm.patchValue({ password: '' }); 
      }
    } catch (error: any) {
      console.error('[LoginComponent] Login error:', error);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Convenience getter for email control validation.
   */
  get email() {
    return this.loginForm.get('email');
  }

  /**
   * Convenience getter for password control validation.
   */
  get password() {
    return this.loginForm.get('password');
  }
}
