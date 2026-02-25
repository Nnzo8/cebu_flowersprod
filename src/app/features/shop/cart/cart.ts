import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { SupabaseService, Order } from '../../../core/services/supabase.service';
import { NavbarComponent } from '../../../shared/components/navbar.component/navbar.component';

type TabType = 'cart' | 'active' | 'past';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, NavbarComponent, CurrencyPipe, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cart implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private supabaseService = inject(SupabaseService);

  // ====== TAB STATE ======
  readonly activeTab = signal<TabType>('cart');

  // ====== CART STATE (from CartService) ======
  readonly cartItems = this.cartService.cartItems;
  readonly subtotal = this.cartService.subtotal;
  readonly total = this.cartService.total;
  readonly isCartEmpty = this.cartService.isCartEmpty;

  // ====== ORDERS STATE (from Supabase) ======
  readonly activeOrders = signal<Order[]>([]);
  readonly pastOrders = signal<Order[]>([]);
  readonly ordersLoading = signal(false);

  // ====== MODAL STATE ======
  readonly showOrderModal = signal(false);
  readonly selectedOrder = signal<Order | null>(null);

  constructor() {}

  ngOnInit(): void {
    this.loadUserOrders();
  }

  /**
   * Load user-specific orders from Supabase
   */
  private async loadUserOrders(): Promise<void> {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.email) {
      console.warn('No user logged in, cannot load orders');
      return;
    }

    this.ordersLoading.set(true);

    try {
      // Fetch active orders
      const { data: activeData } = await this.supabaseService.getUserActiveOrders(currentUser.email);
      if (activeData) {
        this.activeOrders.set(activeData);
      }

      // Fetch past orders
      const { data: pastData } = await this.supabaseService.getUserPastOrders(currentUser.email);
      if (pastData) {
        this.pastOrders.set(pastData);
      }
    } catch (error) {
      console.error('Failed to load user orders:', error);
    } finally {
      this.ordersLoading.set(false);
    }
  }

  // ====== METHODS ======

  /**
   * Switch active tab
   */
  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  /**
   * Update cart item quantity (delegate to CartService)
   */
  updateQuantity(itemId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    this.cartService.updateQuantity(itemId, newQuantity);
  }

  /**
   * Remove item from cart (delegate to CartService)
   */
  removeFromCart(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  /**
   * Proceed to checkout
   */
  proceedToCheckout(): void {
    const userCartItems = this.cartService.getUserCartItems();
    if (userCartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    const checkoutData = {
      items: userCartItems,
      subtotal: this.subtotal(),
      total: this.total(),
    };

    this.router.navigate(['/shop/checkout'], { state: checkoutData });
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    const baseClass = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium';
    const normalizedStatus = status?.toLowerCase() || '';
    
    switch (normalizedStatus) {
      case 'pending':
        return `${baseClass} bg-yellow-50 text-yellow-700`;
      case 'making':
        return `${baseClass} bg-pink-50 text-pink-600`;
      case 'ready':
        return `${baseClass} bg-blue-50 text-blue-600`;
      case 'delivered':
        return `${baseClass} bg-green-50 text-green-600`;
      default:
        return `${baseClass} bg-slate-50 text-slate-600`;
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      making: 'Being Prepared',
      ready: 'Ready to Deliver',
      delivered: 'Delivered',
    };
    return labels[status?.toLowerCase() || ''] || status;
  }

  /**
   * Order again (add past order items to cart and proceed to checkout)
   */
  orderAgain(order: Order): void {
    if (!order.items || order.items.length === 0) {
      alert('This order has no items');
      return;
    }

    // Add each item from the past order to the current cart
    order.items.forEach((item) => {
      this.cartService.addItem({
        productId: item.product_id,
        name: item.product_name,
        price: item.price,
        imageUrl: 'https://via.placeholder.com/100', // Default image
      });
    });

    // Calculate totals and prepare checkout data
    const userCartItems = this.cartService.getUserCartItems();
    const subtotal = this.cartService.subtotal();
    const total = this.cartService.total();

    // Navigate to checkout with the combined cart data
    const checkoutData = {
      items: userCartItems,
      subtotal,
      total,
    };

    this.router.navigate(['/shop/checkout'], { state: checkoutData });
  }

  /**
   * Format date helper
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Open order modal with order details
   */
  selectOrder(order: Order): void {
    this.selectedOrder.set(order);
    this.showOrderModal.set(true);
  }

  /**
   * Close order modal
   */
  closeOrderModal(): void {
    this.showOrderModal.set(false);
    setTimeout(() => {
      this.selectedOrder.set(null);
    }, 300);
  }}