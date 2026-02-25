import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNavbarComponent } from '../../../shared/components/admin-navbar.component/admin-navbar.component';
import { SupabaseService } from '../../../core/services/supabase.service';

interface Order {
  id: string;
  customer_name: string;
  order_date: string | Date;
  total_price: number;
  status: 'Pending' | 'Making' | 'Ready' | 'Delivered';
  customer_email?: string;
  customer_phone?: string;
  delivery_address?: string;
  payment_method?: string;
  items?: any[];
}

@Component({
  selector: 'app-manage-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavbarComponent],
  templateUrl: './manage-orders.html',
  styleUrl: './manage-orders.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageOrders implements OnInit {
  private supabaseService = inject(SupabaseService);

  // Signal for managing orders
  orders = signal<Order[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Signal for the selected filter/tab
  selectedFilter = signal<'all' | 'Pending' | 'Making' | 'Ready' | 'Delivered'>('all');

  // Computed signal for filtered orders
  filteredOrders = computed(() => {
    const filter = this.selectedFilter();
    const allOrders = this.orders();

    if (filter === 'all') {
      return allOrders;
    }

    return allOrders.filter((order) => order.status === filter);
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  /**
   * Load all orders from Supabase
   */
  private async loadOrders(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Fetch all orders from the database
      const { data, error } = await this.supabaseService.supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        this.error.set('Failed to load orders from database');
        return;
      }

      if (data) {
        this.orders.set(data as Order[]);
        console.log('Orders loaded successfully:', data);
      }
    } catch (exception: any) {
      console.error('Exception loading orders:', exception);
      this.error.set(exception.message || 'An error occurred while loading orders');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Set the selected filter
   */
  setFilter(filter: string): void {
    this.selectedFilter.set(filter as 'all' | 'Pending' | 'Making' | 'Ready' | 'Delivered');
  }

  /**
   * Handle status change from dropdown
   */
  onStatusChange(orderId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target?.value) {
      this.updateOrderStatus(orderId, target.value);
    }
  }

  /**
   * Update the status of an order in the database and update the Signal.
   * @param orderId - The ID of the order to update
   * @param newStatus - The new status value
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      // Update in Supabase
      const { error } = await this.supabaseService.supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        alert('Failed to update order status. Please try again.');
        // Reload orders to revert UI
        this.loadOrders();
        return;
      }

      // Update local state
      const updatedOrders = this.orders().map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus as Order['status'] }
          : order
      );
      this.orders.set(updatedOrders);
      console.log('Order status updated successfully:', orderId, newStatus);
    } catch (exception: any) {
      console.error('Exception updating order status:', exception);
      alert('An error occurred while updating the order status.');
    }
  }

  /**
   * Export the current filtered orders to a CSV file.
   * Uses vanilla TypeScript to generate CSV without external libraries.
   */
  exportToCSV(): void {
    const dataToExport = this.filteredOrders();

    // Define CSV headers
    const headers = ['Order ID', 'Customer Name', 'Date', 'Total', 'Status'];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...dataToExport.map((order) =>
        [
          order.id,
          `"${order.customer_name}"`, // Wrap in quotes to handle names with commas
          this.formatDate(order.order_date),
          `₱${order.total_price.toFixed(2)}`,
          order.status,
        ].join(',')
      ),
    ].join('\n');

    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary URL for the Blob
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Set the download attributes and trigger the download
    link.setAttribute('href', url);
    link.setAttribute('download', 'orders.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Get the appropriate badge styling based on order status.
   */
  getStatusBadgeClass(status: string): string {
    const baseClass = 'inline-block px-3 py-1 rounded-full text-sm font-medium';
    const statusClasses: Record<string, string> = {
      'Pending': `${baseClass} bg-slate-100 text-slate-600`,
      'Making': `${baseClass} bg-pink-50 text-pink-600`,
      'Ready': `${baseClass} bg-pink-500 text-white`,
      'Delivered': `${baseClass} bg-green-100 text-green-700`,
    };
    return statusClasses[status] || baseClass;
  }

  /**
   * Format currency for display (using PHP)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
