import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  /**
   * Signal to track the current authentication state.
   * Synced with Supabase session state.
   */
  readonly isLoggedIn = signal(false);

  /**
   * Signal to store the current user's information (email, role, etc).
   * Populated from Supabase user metadata.
   */
  readonly currentUser = signal<{ email?: string; role?: 'admin' | 'user' } | null>(null);

  /**
   * Computed signal to check if user is admin
   */
  readonly isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.role === 'admin';
  });

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from Supabase session.
   * Subscribes to auth state changes automatically.
   */
  private initializeAuth(): void {
    // Listen to Supabase session changes
    this.supabaseService.getSession$().subscribe(async (session) => {
      if (session) {
        // User is logged in
        const user = await this.supabaseService.getCurrentUser();
        if (user) {
          this.currentUser.set({
            email: user.email,
            role: user.user_metadata?.role || 'user',
          });
          this.isLoggedIn.set(true);
        }
      } else {
        // User is logged out
        this.currentUser.set(null);
        this.isLoggedIn.set(false);
      }
    });
  }

  /**
   * Login a user with email and password via Supabase Auth
   * @param email User email
   * @param password User password
   */
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AuthService] Starting login. Calling supabaseService.signIn...');
      const { user, error } = await this.supabaseService.signIn(email, password);
      console.log('[AuthService] signIn returned. user:', user, 'error:', error);

      if (error) {
        console.error('[AuthService] Login error from Supabase:', error);
        return { success: false, error: error.message };
      }

      if (user) {
        console.log('[AuthService] User authenticated:', user.email);
        const role = await this.supabaseService.getUserRole();
        console.log('[AuthService] Retrieved user role:', role);
        
        this.currentUser.set({
          email: user.email,
          role: role || 'user',
        });
        this.isLoggedIn.set(true);
        console.log('[AuthService] Updated currentUser signal:', this.currentUser());
        return { success: true };
      }

      console.log('[AuthService] No user returned from signIn');
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('[AuthService] Login exception:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register a new user via Supabase Auth
   * Flow:
   * 1. Create auth user (Supabase handles password hashing)
   * 2. Send email confirmation link to user
   * 3. Create user record in users table with full_name
   * 4. Return success/error
   * @param email User email
   * @param password User password (will be hashed by Supabase)
   * @param fullName User's full name
   * @param isAdmin Whether the user is an admin (default: false)
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    isAdmin: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AuthService] Starting registration for:', email);
      const role = isAdmin ? 'admin' : 'user';

      // Step 1: Create auth user with Supabase
      // Supabase will automatically hash the password server-side
      const { user, error } = await this.supabaseService.signUp(email, password, role);

      if (error) {
        console.error('[AuthService] Sign up error:', error);
        return { success: false, error: error.message || 'Registration failed' };
      }

      if (!user) {
        console.error('[AuthService] No user returned from sign up');
        return { success: false, error: 'Registration failed' };
      }

      console.log('[AuthService] Auth user created successfully:', user.email);

      // Step 2: Create user record in users table
      try {
        const createResult = await this.supabaseService.createUserRecord(user.id, email, fullName, role);
        
        if (createResult.error) {
          console.error('[AuthService] Error creating user record:', createResult.error);
          // Non-fatal error - user is still registered, just log it
          console.log('[AuthService] Continuing despite user record creation error');
        } else {
          console.log('[AuthService] User record created successfully in users table');
        }
      } catch (error) {
        console.error('[AuthService] Exception creating user record:', error);
        // Non-fatal error - continue
      }

      // Step 3: Set local state (user won't be fully logged in until email is verified)
      this.currentUser.set({
        email: user.email,
        role: role,
      });

      console.log('[AuthService] Registration successful. Confirmation email sent to:', email);
      return { success: true };
    } catch (error: any) {
      console.error('[AuthService] Registration exception:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }

  /**
   * Logout the current user via Supabase Auth
   */
  async logout(): Promise<void> {
    try {
      await this.supabaseService.signOut();
      this.currentUser.set(null);
      this.isLoggedIn.set(false);
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
