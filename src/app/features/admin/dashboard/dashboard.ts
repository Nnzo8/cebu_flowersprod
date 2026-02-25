import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService, Order } from '../../../core/services/supabase.service';
import { AdminNavbarComponent } from '../../../shared/components/admin-navbar.component/admin-navbar.component';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminNavbarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // UI State
  readonly userName = signal('Admin');
  readonly isLoading = signal(false);

  // Stats Cards Data
  readonly statsCards = signal<StatCard[]>([]);

  // Recent Orders Data (last 3 days)
  readonly recentOrders = signal<Order[]>([]);

  constructor() {
    this.setUserName();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load all dashboard data
   */
  private async loadDashboardData(): Promise<void> {
    this.isLoading.set(true);

    try {
      // Fetch all orders
      const { data: allOrders } = await this.supabaseService.getAllOrders();

      if (allOrders) {
        // Filter orders from last 3 days
        const recentOrdersFiltered = this.getOrdersFromLast3Days(allOrders);
        this.recentOrders.set(recentOrdersFiltered);

        // Calculate statistics
        this.generateStatistics(allOrders);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get orders from the last 3 days
   */
  private getOrdersFromLast3Days(orders: Order[]): Order[] {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    return orders
      .filter((order) => {
        const orderDate = new Date(order.order_date);
        return orderDate >= threeDaysAgo;
      })
      .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
  }

  /**
   * Generate statistics from orders
   */
  private generateStatistics(allOrders: Order[]): void {
    // Get last 3 days orders for comparison
    const last3DaysOrders = this.getOrdersFromLast3Days(allOrders);

    // Calculate total revenue (last 3 days)
    const totalRevenue = last3DaysOrders.reduce((sum, order) => sum + order.total_price, 0);

    // Calculate total orders (last 3 days)
    const totalOrders = last3DaysOrders.length;

    // Calculate active orders (Pending or Making status - last 3 days)
    const activeOrders = last3DaysOrders.filter((order) =>
      ['Pending', 'Making'].includes(order.status)
    ).length;

    // Calculate average order value (last 3 days)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate completed orders (last 3 days)
    const completedOrders = last3DaysOrders.filter((order) => order.status === 'Delivered').length;

    // Prepare stats cards
    const stats: StatCard[] = [
      {
        title: 'Total Revenue',
        value: `₱${totalRevenue.toFixed(2)}`,
        icon: '💰',
        trend: `${totalOrders} orders`,
      },
      {
        title: 'Active Orders',
        value: activeOrders,
        icon: '📦',
        trend: `${completedOrders} completed`,
      },
      {
        title: 'Avg Order Value',
        value: `₱${avgOrderValue.toFixed(2)}`,
        icon: '📊',
        trend: `${totalOrders} orders`,
      },
    ];

    this.statsCards.set(stats);
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
   * Get badge color based on order status
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Making: 'bg-blue-100 text-blue-800',
      Ready: 'bg-purple-100 text-purple-800',
      Delivered: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Get badge label
   */
  getStatusLabel(status: string): string {
    return status;
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
