import { Component, ChangeDetectionStrategy, signal, computed, effect, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { NavbarComponent } from '../../../shared/components/navbar.component/navbar.component';
import { SupabaseService, Product } from '../../../core/services/supabase.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule, NavbarComponent, CurrencyPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  private readonly cartService = inject(CartService);

  // State: All products from Supabase
  readonly products = signal<Product[]>([]);

  // State: Loading indicator
  readonly loading = signal(false);

  // State: Error message
  readonly error = signal<string | null>(null);

  // NEW: State for Toast Notification
  readonly showToast = signal(false);
  private toastTimeout: any;

  // Computed: Best sellers - first 4 products from Supabase
  readonly bestSellers = computed(() => {
    const allProducts = this.products();
    return allProducts.slice(0, 4);
  });

  constructor() {
    effect(() => {
      if (this.error() !== null) {
        // Error is set, user can manually trigger retry
      }
    });
  }

  ngOnInit(): void {
    this.fetchProducts();
  }

  /**
   * Fetch products from Supabase and sync with signals
   */
  private async fetchProducts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabaseService.getProducts();

    if (error) {
      this.error.set('Failed to load products');
      console.error('Product fetch error:', error);
    } else if (data) {
      this.products.set(data);
    }

    this.loading.set(false);
  }

  /**
   * Retry fetching products (user-triggered)
   */
  async retryFetch(): Promise<void> {
    await this.fetchProducts();
  }

  /**
   * Add product to cart
   */
  addToCart(product: Product): void {
    this.cartService.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    this.showToast.set(true);
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.showToast.set(false);
    }, 2000);
  }
}
