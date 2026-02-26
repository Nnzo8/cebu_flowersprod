import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

/**
 * Cart item interface
 */
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  userId?: string; // Link to user account
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  //requesting dependencies(DI)
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  // Signal: Cart items for the current user
  readonly cartItems = signal<CartItem[]>([]);

  // Computed: Check if cart is empty
  readonly isCartEmpty = computed(() => this.cartItems().length === 0);

  // Computed: Calculate cart subtotal(Whenever this.cartItems changes, subtotal will be recalculated automatically)
  readonly subtotal = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  // Computed: Calculate cart total
  readonly total = computed(() => {
    return this.subtotal();
  });

  // Track if we're syncing with Supabase to avoid duplicate syncs
  private isSyncing = false;

  constructor() {
    this.initializeCart();
    this.setupAuthListener();
  }

  /**
   * Initialize cart: load from localStorage, then sync with Supabase if logged in
   */
  private initializeCart(): void {
    this.loadCartFromLocalStorage();
    this.syncWithSupabase();
  }

  /**
   * Setup listener for auth changes to reload cart when user logs in/out
   */
  private setupAuthListener(): void {
    // When currentUser logs in or out, reload their cart
    effect(() => {
      const user = this.authService.currentUser();
      if (user?.email) {
        this.syncWithSupabase();//sync cart with Supabase so we can get the saved carts from db
      } else {
        // User logged out, try to load from localStorage
        this.loadCartFromLocalStorage();
      }
    });
  }

  /**
   * Sync cart with Supabase for authenticated users
   */
  private async syncWithSupabase(): Promise<void> {
    if (this.isSyncing) return;//prevents multiple sync operations from running at the same time

    const currentUser = this.authService.currentUser();
    
    if (!currentUser?.email) {
      // User is not logged in, use localStorage only
      return;
    }

    this.isSyncing = true;//lock the sync so no other sync can start until this one finishes

    try {
      // Load cart from Supabase db for the current logged-in user
      const { data, error } = await this.supabaseService.getCartItems(currentUser.email);

      if (error) {
        console.error('[CartService] Error syncing cart with Supabase:', error);
        this.isSyncing = false;
        return;
      }

      if (data && data.length > 0) {
        // Convert Supabase cart items to CartItem format
        const cartItems: CartItem[] = data.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          price: item.price,
          imageUrl: item.image_url,
          quantity: item.quantity,
          userId: item.user_email,
        }));

        this.cartItems.set(cartItems);//update the cart signal with the freshly fetched items

        // Also save to localStorage as fallback
        this.saveCartToLocalStorage();
      } else {
        // No items in Supabase, check localStorage in case they added items before logging in
        this.loadCartFromLocalStorage();
      }
    } catch (error) {
      console.error('[CartService] Exception syncing cart:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Add item to cart (sync to Supabase if logged in)
   */
  addItem(product: { id?: string; productId: string; name: string; price: number; imageUrl: string }): void {
    const currentUser = this.authService.currentUser();
    const userEmail = currentUser?.email || 'guest';// Get the currently logged in user, or fall back to 'guest'
    
    const existingItem = this.cartItems().find((item) => item.productId === product.productId);// Check if this product is already in the cart by matching productId

    if (existingItem) {
      // Increase quantity if item already exists
      this.updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,// generates a unique id using current timestamp
        productId: product.productId,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: 1,
        userId: userEmail,
      };
      
      this.cartItems.update((items) => [...items, newItem]);// spread the existing items into a new array with the new item appended
      this.saveCartToLocalStorage();

      // Sync to Supabase if user is logged in
      if (currentUser?.email) {
        this.syncItemToSupabase(currentUser.email, product.productId, product.name, product.price, product.imageUrl, 1);
      }
      console.log('[CartService] Added to cart:', product.name);
    }
  }

  /**
   * Update item quantity (sync to Supabase if logged in)
   */
  updateQuantity(itemId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeItem(itemId);// If quantity drops to 0 or below, remove the item entirely
      return;
    }

    const item = this.cartItems().find((i) => i.id === itemId);// Find the item we want to update
    if (!item) return;

    this.cartItems.update((items) =>
      items.map((i) => (i.id === itemId ? { ...i, quantity: newQuantity } : i))//loops and updates the quantity of the matching item, while leaving other items unchanged
    );
    this.saveCartToLocalStorage();

    // If the user is logged in, also update the item from Supabase
    const currentUser = this.authService.currentUser();
    if (currentUser?.email) {
      this.supabaseService.updateCartItemQuantity(currentUser.email, item.productId, newQuantity).catch((error) => {
        console.error('[CartService] Error updating cart in Supabase:', error);
      });
    }
  }

  /**
   * Remove item from cart (sync to Supabase if logged in)
   */
  removeItem(itemId: string): void {
    const item = this.cartItems().find((i) => i.id === itemId);// Find the item we want to remove
    if (!item) return;

    this.cartItems.update((items) => items.filter((i) => i.id !== itemId));
    this.saveCartToLocalStorage();

    // If the user is logged in, also delete the item from Supabase
    const currentUser = this.authService.currentUser();
    if (currentUser?.email) {
      this.supabaseService.removeCartItem(currentUser.email, item.productId).catch((error) => {
        console.error('[CartService] Error removing cart item in Supabase:', error);
      });
    }
  }

  /**
   * Clear entire cart (sync to Supabase if logged in)
   */
  clearCart(): void {
    this.cartItems.set([]);//wipe out the cart items signal to an empty array
    this.saveCartToLocalStorage();// Persist the empty cart to localStorage immediately so the cart stays empty even after a page refresh
  

    // If the user is logged in, also clear their cart in Supabase
    const currentUser = this.authService.currentUser();
    if (currentUser?.email) {
      this.supabaseService.clearUserCart(currentUser.email).catch((error) => {
        console.error('[CartService] Error clearing cart in Supabase:', error);
      });
    }
  }

  /**
   * Sync item to Supabase
   */
  private async syncItemToSupabase(
    userEmail: string,
    productId: string,
    productName: string,
    price: number,
    imageUrl: string,
    quantity: number
  ): Promise<void> {
    try {
      // Pass all the item details to Supabase to persist in the database
      await this.supabaseService.addItemToCart(userEmail, productId, productName, price, imageUrl, quantity);
    } catch (error) {
      console.error('[CartService] Error syncing item to Supabase:', error);
    }
  }

  /**
   * Get current user's cart items
   */
  getUserCartItems(): CartItem[] {
    const userId = this.authService.currentUser()?.email || 'guest';
    return this.cartItems().filter((item) => item.userId === userId);
  }

  /**
   * Save cart to localStorage
   */
  private saveCartToLocalStorage(): void {
    const currentUser = this.authService.currentUser()?.email || 'guest';// Get the currently logged in user's email, or fall back to 'guest'
    const cartKey = `cart_${currentUser}`;// Build a unique localStorage key per user so each user has their own cart
    try {
      localStorage.setItem(cartKey, JSON.stringify(this.cartItems()));//convert the cartItems array into a JSON string before saving
    } catch (error) {
      console.error('[CartService] Failed to save cart to localStorage:', error);
    }
  }

  /**
   * Load cart from localStorage
   */
  private loadCartFromLocalStorage(): void {
    const currentUser = this.authService.currentUser()?.email || 'guest'; // Get the currently logged in user's email, or fall back to 'guest'
    const cartKey = `cart_${currentUser}`;// Build a unique localStorage key per user so each user has their own cart
    try {
      const stored = localStorage.getItem(cartKey);// Attempt to retrieve the stored cart string from the browser's localStorage
      if (stored) {
        // localStorage only stores strings, so we parse the JSON string
        // back into a JavaScript array/object before setting it
        this.cartItems.set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[CartService] Failed to load cart from localStorage:', error);
    }
  }

  /**
   * Reload cart when user changes (for user-specific carts)
   */
  reloadCartForCurrentUser(): void {
    this.syncWithSupabase();
  }
}
