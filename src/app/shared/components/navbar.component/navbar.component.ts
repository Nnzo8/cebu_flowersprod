import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

interface NavLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sticky]': 'true',
    '[class.top-0]': 'true',
    '[class.z-50]': 'true',
    '[class.w-full]': 'true',
  },
})
export class NavbarComponent implements OnInit {
  // Inject AuthService and Router
  private authService = inject(AuthService);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  // State
  readonly isMenuOpen = signal(false);
  readonly isScrolling = signal(false);
  readonly isProfileOpen = signal(false);
  readonly userFullName = signal<string | null>(null);
  readonly userInitials = computed(() => {
    const fullName = this.userFullName();
    if (!fullName) return '';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  });

  // Navigation links
  readonly navLinks: NavLink[] = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop/catalog' },
    { label: 'Orders', path: '/shop/cart' },
    { label: 'Contact', path: '/shop/contact' },
  ];

  // Computed state for derived UI logic
  readonly menuIcon = computed(() => (this.isMenuOpen() ? '✕' : '☰'));
  readonly cartItemCount = computed(() => 0); // Placeholder - will be replaced by cart service signal
  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());
  readonly currentUser = computed(() => this.authService.currentUser());
  readonly isAuthPage = computed(() => this.router.url.includes('/auth'));
  readonly isAdminPage = computed(() => this.router.url.includes('/admin'));
  readonly shouldShowNavbar = computed(() => !this.isAuthPage() && !this.isAdminPage());
  readonly shouldShowAuthButtons = computed(() => !this.isAuthPage());

  ngOnInit(): void {
    this.setupScrollListener();
    this.loadUserProfile();
  }

  /**
   * Load user's full name from Supabase users table
   */
  private async loadUserProfile(): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser?.email) {
      this.userFullName.set(null);
      return;
    }

    try {
      const { data, error } = await this.supabaseService.supabase
        .from('users')
        .select('full_name')
        .eq('email', currentUser.email)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        // Fallback to using email as name
        this.userFullName.set(currentUser.email || 'User');
        return;
      }

      if (data?.full_name) {
        this.userFullName.set(data.full_name);
      } else {
        // Fallback to email if no full name
        this.userFullName.set(currentUser.email || 'User');
      }
    } catch (error) {
      console.error('Exception loading user profile:', error);
      this.userFullName.set(currentUser.email || 'User');
    }
  }

  /**
   * Toggle mobile menu state
   */
  toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  /**
   * Toggle profile dropdown
   */
  toggleProfile(): void {
    this.isProfileOpen.update((value) => !value);
  }

  /**
   * Close profile dropdown
   */
  closeProfile(): void {
    this.isProfileOpen.set(false);
  }

  /**
   * Close menu when a link is clicked
   */
  onNavLinkClick(): void {
    this.isMenuOpen.set(false);
  }

  /**
   * Handle user logout by calling the auth service.
   */
  logout(): void {
    this.closeProfile();
    this.authService.logout();
    this.isMenuOpen.set(false);
  }
  
  /**
   * Setup scroll listener for navbar styling
   */
  private setupScrollListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        const isScrolled = window.scrollY > 0;
        if (isScrolled !== this.isScrolling()) {
          this.isScrolling.set(isScrolled);
        }
      });
    }
  }
}
