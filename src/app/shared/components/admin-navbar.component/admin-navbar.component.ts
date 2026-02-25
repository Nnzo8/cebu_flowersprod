import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-navbar.component.html',
  styleUrl: './admin-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly isMenuOpen = signal(false);
  readonly userName = signal('Admin');

  readonly navLinks: NavLink[] = [
    { label: 'Home', path: '/admin/dashboard', icon: '📊' },
    { label: 'Products', path: '/admin/inventory', icon: '📦' },
    { label: 'Orders', path: '/admin/manage-orders', icon: '🛒' },
  ];

  constructor() {
    this.setUserName();
  }

  /**
   * Extract user name from auth service
   */
  private setUserName(): void {
    const user = this.authService.currentUser();
    if (user?.email) {
      const name = user.email.split('@')[0];
      this.userName.set(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }

  /**
   * Toggle mobile menu
   */
  toggleMenu(): void {
    this.isMenuOpen.update(val => !val);
  }

  /**
   * Close menu when link clicked
   */
  onNavLinkClick(): void {
    this.isMenuOpen.set(false);
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
