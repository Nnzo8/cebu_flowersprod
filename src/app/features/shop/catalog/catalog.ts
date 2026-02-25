import { Component, ChangeDetectionStrategy, signal, computed, effect, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService, Product } from '../../../core/services/supabase.service';
import { CartService } from '../../../core/services/cart.service';
import { NavbarComponent } from '../../../shared/components/navbar.component/navbar.component';
import { FormsModule } from '@angular/forms';

type CategoryType = 'All' | 'Anniversary' | 'Birthdays' | 'Sympathy' | 'Weddings';

@Component({
  selector: 'app-catalog',
  imports: [CommonModule, NavbarComponent, CurrencyPipe, FormsModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog implements OnInit {
  private readonly supabaseService = inject(SupabaseService);
  private readonly cartService = inject(CartService);
  
  // State: All products from Supabase
  readonly products = signal<Product[]>([]);

  // State: Loading indicator
  readonly loading = signal(false);

  // State: Error message
  readonly error = signal<string | null>(null);

  // State: Selected category filter
  readonly selectedCategory = signal<CategoryType>('All');

  // State: Search query
  readonly searchQuery = signal<string>('');

  // NEW: State for Toast Notification
  readonly showToast = signal(false);
  private toastTimeout: any;

  // Category options
  readonly categories: CategoryType[] = ['All', 'Anniversary', 'Birthdays', 'Sympathy', 'Weddings'];

  // Computed: Filter by category first
  readonly filteredByCategory = computed(() => {
    const selected = this.selectedCategory();
    if (selected === 'All') {
      return this.products();
    }
    return this.products().filter((product) => product.category === selected);
  });

  // Computed: Filter by category AND search query
  readonly filteredProducts = computed(() => {
    const search = this.searchQuery().toLowerCase().trim();
    const categoryFiltered = this.filteredByCategory();
    
    if (!search) {
      return categoryFiltered;
    }
    
    return categoryFiltered.filter((product) => 
      product.name.toLowerCase().includes(search) ||
      (product.description?.toLowerCase().includes(search) ?? false)
    );
  });

  constructor() {
    // Automatically retry API call when error changes (user clicks retry)
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
   * Update selected category
   */
  selectCategory(category: CategoryType): void {
    this.selectedCategory.set(category);
  }

  /**
   * Update search query
   */
  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery.set('');
  }

  /**
   * Handle add to cart by calling CartService and showing toast
   */
  addToCart(product: Product): void {
    // 1. Add to the actual cart service
    this.cartService.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });

    // 2. Trigger the toast animation
    this.showToast.set(true);

    // 3. Clear any existing timer so it doesn't vanish too early if clicked twice rapidly
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    // 4. Hide the toast after 3 seconds
    this.toastTimeout = setTimeout(() => {
      this.showToast.set(false);
    }, 2000);
  }
}