import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
// 1. Import your SupabaseService
import { SupabaseService } from '../services/supabase.service';

/**
 * Admin Route Guard
 * Protects admin routes by checking:
 * 1. An active session exists in Supabase
 * 2. The user's email matches the admin email
 */
// 2. Add 'async' here
export const adminGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabaseService = inject(SupabaseService);
  const authService = inject(AuthService); // Optional now, but good to keep

  try {
    // 3. FORCE Angular to wait for Supabase to check the browser's storage
    // (Note: This assumes your SupabaseService exposes the 'supabase' client object. 
    // If you use a custom method like getSession(), call that instead!)
    const { data } = await supabaseService.supabase.auth.getSession();
    const session = data.session;

    // Check if user is logged in
    if (!session) {
      console.warn('[AdminGuard] Access denied: User not authenticated');
      router.navigate(['/auth/login']);
      return false;
    }

    // Check if the user is the admin via their email
    if (session.user.email !== 'cebuflowersadmin@gmail.com') {
      console.warn('[AdminGuard] Access denied: User is not an admin');
      router.navigate(['/auth/login']); // Or redirect to '/'
      return false;
    }

    // User is authenticated and is the admin - allow access
    console.log('[AdminGuard] Access granted: User is admin');
    return true;

  } catch (error) {
    console.error('[AdminGuard] Error checking session:', error);
    router.navigate(['/auth/login']);
    return false;
  }
};