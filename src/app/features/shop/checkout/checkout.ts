import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar.component/navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

/**
 * Cart item interface (synced with Cart component)
 */
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

/**
 * Order interface for receipt
 */
export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  landmark?: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: CartItem[];
  orderDate: Date;
}

type CheckoutState = 'form' | 'success';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout implements OnInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  // ====== STATE ======
  readonly checkoutState = signal<CheckoutState>('form');
  readonly isProcessing = signal(false);
  readonly showDownpaymentModal = signal(false);

  // Form
  checkoutForm: FormGroup;

  // Order data (from navigation state or mock)
  readonly cartItems = signal<CartItem[]>([]);
  readonly subtotal = signal(0);
  readonly deliveryFee = signal(150); // Fixed delivery fee

  // Computed: Total price
  readonly total = computed(() => this.subtotal() + this.deliveryFee());

  // Current order (populated on successful submission)
  readonly currentOrder = signal<Order | null>(null);

  constructor() {
    this.checkoutForm = this.initializeForm();
  }

  ngOnInit(): void {
    this.loadOrderData();
  }

  /**
   * Initialize checkout form
   */
  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,}$/)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      landmark: ['', [Validators.minLength(3)]],
      paymentMethod: ['cash', Validators.required],
    });
  }

  /**
   * Load cart items and totals from router state or use mock data
   */
  private loadOrderData(): void {
    // Try to get state from ActivatedRoute (most reliable)
    const state = this.activatedRoute.snapshot.paramMap;
    const routerState = (this.router.getCurrentNavigation()?.extras?.state) || 
                        (history.state);

    if (routerState && routerState['items'] && routerState['subtotal']) {
      // Data passed from Cart component
      this.cartItems.set(routerState['items']);
      this.subtotal.set(routerState['subtotal']);
    } else {
      // Mock data for testing
      const mockItems: CartItem[] = [
        {
          id: '1',
          productId: 'p1',
          name: 'Red Rose Bouquet',
          price: 85,
          imageUrl: 'https://via.placeholder.com/100',
          quantity: 2,
        },
        {
          id: '2',
          productId: 'p2',
          name: 'Sunflower Dream',
          price: 65,
          imageUrl: 'https://via.placeholder.com/100',
          quantity: 1,
        },
      ];
      this.cartItems.set(mockItems);
      const mockSubtotal = mockItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      this.subtotal.set(mockSubtotal);
    }
  }

  /**
   * Submit checkout form
   */
  submitCheckout(): void {
    if (this.checkoutForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.checkoutForm.controls).forEach((key) => {
        this.checkoutForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isProcessing.set(true);

    // Simulate API call delay
    setTimeout(async () => {
      const formValue = this.checkoutForm.value;
      const orderId = `ORD-${Date.now()}`;
      const currentUser = this.authService.currentUser();

      // Create order object
      const order: Order = {
        id: orderId,
        customerName: formValue.fullName,
        email: formValue.email,
        phone: formValue.phone,
        address: formValue.address,
        landmark: formValue.landmark || undefined,
        paymentMethod: formValue.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Credit Card',
        subtotal: this.subtotal(),
        deliveryFee: this.deliveryFee(),
        total: this.total(),
        items: this.cartItems(),
        orderDate: new Date(),
      };

      this.currentOrder.set(order);

      // Insert order into Supabase
      if (currentUser?.email) {
        const supabaseOrderData = {
          id: orderId,
          user_email: currentUser.email,
          customer_name: order.customerName,
          customer_email: order.email,
          customer_phone: order.phone,
          delivery_address: order.address,
          landmark: order.landmark || null,
          order_date: new Date().toISOString(),
          total_price: order.total,
          status: 'Pending',
          payment_method: order.paymentMethod,
          items: order.items,
        };

        const { data, error } = await this.supabaseService.insertOrder(supabaseOrderData as any);
        
        if (error) {
          console.error('Error inserting order:', error);
          alert('There was an error saving your order. Please try again.');
          this.isProcessing.set(false);
          return;
        }

        console.log('Order saved to Supabase:', data);
      }

      this.isProcessing.set(false);
      this.checkoutState.set('success');

      console.log('Order placed:', order);
    }, 1500);
  }

  /**
   * Handle payment method change
   */
  onPaymentMethodChange(): void {
    const paymentMethod = this.checkoutForm.get('paymentMethod')?.value;
    if (paymentMethod === 'cash') {
      this.showDownpaymentModal.set(true);
    }
  }

  /**
   * Close the downpayment modal
   */
  closeDownpaymentModal(): void {
    this.showDownpaymentModal.set(false);
  }

  /**
   * Print receipt
   */
  printReceipt(): void {
    window.print();
  }

  /**
   * Return to shop
   */
  returnToShop(): void {
    this.router.navigate(['/shop/catalog']);
  }

  /**
   * Format date helper
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get form control for validation display
   */
  getControl(name: string) {
    return this.checkoutForm.get(name);
  }
}
