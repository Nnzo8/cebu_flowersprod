import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    role?: 'admin' | 'user';
  };
}

export interface Order {
  id: string;
  user_email: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_address?: string;
  landmark?: string;
  order_date: string | Date;
  total_price: number;
  status: 'Pending' | 'Making' | 'Ready' | 'Delivered';
  items?: OrderItem[];
  payment_method?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private session$ = new BehaviorSubject<Session | null>(null);
  
  // Table names
  private readonly PRODUCTS_TABLE = 'products';
  private readonly USERS_TABLE = 'users';
  private readonly ORDERS_TABLE = 'orders';
  private readonly USER_CARTS_TABLE = 'user_carts';

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  /**
   * Initialize session on app startup (called by APP_INITIALIZER)
   * This ensures the session is restored from Supabase before the app renders
   */
  async initSupabaseSession(): Promise<void> {
    try {
      console.log('[SupabaseService] Initializing Supabase session...');
      
      // Restore session from Supabase (checks localStorage and validates token)
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('[SupabaseService] Error getting session:', error);
        this.session$.next(null);
      } else {
        console.log('[SupabaseService] Session restored:', data.session ? 'Active' : 'None');
        this.session$.next(data.session);
      }

      // Listen for auth state changes moving forward
      this.supabase.auth.onAuthStateChange((_, session) => {
        console.log('[SupabaseService] Auth state changed:', session ? 'Logged in' : 'Logged out');
        this.session$.next(session);
      });
    } catch (error) {
      console.error('[SupabaseService] Exception initializing session:', error);
      this.session$.next(null);
    }
  }

  /**
   * Initialize session on service creation (deprecated - use initSupabaseSession via APP_INITIALIZER)
   */
  private async initializeSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.session$.next(data.session);

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_, session) => {
      this.session$.next(session);
    });
  }

  /**
   * Get current session observable
   */
  getSession$(): Observable<Session | null> {
    return this.session$.asObservable();
  }

  /**
   * Get current session synchronously (for quick checks)
   */
  getSessionSync(): Session | null {
    return this.session$.getValue();
  }

  /**
   * Create a user record in the users table after successful auth signup
   * This stores the user's full name and role in the database
   * @param userId The authenticated user ID from Supabase Auth
   * @param email User's email
   * @param fullName User's full name
   * @param role User's role ('admin' or 'user')
   */
  async createUserRecord(
    userId: string,
    email: string,
    fullName: string,
    role: 'admin' | 'user' = 'user'
  ): Promise<{ data: any; error: any }> {
    try {
      console.log('[SupabaseService] Creating user record for:', userId, email);

      const { data, error } = await this.supabase
        .from(this.USERS_TABLE)
        .insert([
          {
            id: userId,
            email: email,
            full_name: fullName,
            role: role,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('[SupabaseService] Error creating user record:', error);
        return { data: null, error };
      }

      console.log('[SupabaseService] User record created successfully:', data);
      return { data, error: null };
    } catch (error) {
      console.error('[SupabaseService] Exception creating user record:', error);
      return { data: null, error };
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, role: 'admin' | 'user' = 'user'): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { user: null, error };
      }

      return { user: data.user as any, error: null };
    } catch (error) {
      console.error('Sign up exception:', error);
      return { user: null, error };
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    try {
      console.log('[SupabaseService] Attempting signIn with email:', email);
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('[SupabaseService] signInWithPassword response - user:', data.user?.email, 'error:', error);

      if (error) {
        console.error('[SupabaseService] Sign in error:', error);
        return { user: null, error };
      }

      console.log('[SupabaseService] Sign in successful for:', data.user?.email);
      return { user: data.user as any, error: null };
    } catch (error) {
      console.error('[SupabaseService] Sign in exception:', error);
      return { user: null, error };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out exception:', error);
      return { error };
    }
  }

  /**
   * Send password reset email via Supabase Auth.
   * The user will receive an email with a reset link that redirects to /auth/update-password.
   * @param email User's email address
   */
  async sendPasswordResetEmail(email: string): Promise<{ error: any }> {
    try {
      console.log('[SupabaseService] Sending password reset email to:', email);
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        console.error('[SupabaseService] Password reset email error:', error);
        return { error };
      }

      console.log('[SupabaseService] Password reset email sent to:', email);
      return { error: null };
    } catch (error: any) {
      console.error('[SupabaseService] Password reset email exception:', error);
      return { error };
    }
  }

  /**
   * Update the user's password using the recovery token from the reset email.
   * This is called in recovery mode (after clicking the reset link).
   * Supabase automatically handles the recovery session.
   * @param newPassword The new password to set
   */
  async updateUserPassword(newPassword: string): Promise<{ error: any }> {
    try {
      console.log('[SupabaseService] Updating user password...');
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('[SupabaseService] Password update error:', error);
        return { error };
      }

      console.log('[SupabaseService] Password updated successfully');
      return { error: null };
    } catch (error: any) {
      console.error('[SupabaseService] Password update exception:', error);
      return { error };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const session = this.getSessionSync();
    if (!session) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
      user_metadata: session.user.user_metadata as any,
    };
  }

  /**
   * Get current user role from the users table
   */
  async getUserRole(): Promise<'admin' | 'user' | null> {
    const session = this.getSessionSync();
    if (!session) return null;

    try {
      // First try to get role from users table (primary source of truth)
      const { data, error } = await this.supabase
        .from(this.USERS_TABLE)
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        console.log('[SupabaseService] Retrieved user role from users table:', data.role);
        return (data.role as 'admin' | 'user') || 'user';
      }

      console.log('[SupabaseService] No users table entry found, checking user_metadata');
      // Fallback to user_metadata if users table doesn't have the entry
      const metadataRole = (session.user.user_metadata?.['role'] as 'admin' | 'user');
      if (metadataRole) {
        console.log('[SupabaseService] Retrieved user role from metadata:', metadataRole);
        return metadataRole;
      }

      console.log('[SupabaseService] No role found, defaulting to user');
      return 'user';
    } catch (error) {
      console.error('[SupabaseService] Error fetching user role:', error);
      // Fallback to metadata on error
      return (session.user.user_metadata?.['role'] as 'admin' | 'user') || 'user';
    }
  }

  /**
   * Fetch all products
   */
  async getProducts(): Promise<{ data: Product[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.PRODUCTS_TABLE)
        .select('*');
      
        
      if (error) {
        console.error('Fetch products error:', error);
        return { data: null, error };
      }

      return { data: data as Product[], error: null };
    } catch (error) {
      console.error('Fetch products exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch single product by ID
   */
  async getProductById(id: string): Promise<{ data: Product | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.PRODUCTS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Fetch product ${id} error:`, error);
        return { data: null, error };
      }

      return { data: data as Product, error: null };
    } catch (error) {
      console.error(`Fetch product ${id} exception:`, error);
      return { data: null, error };
    }
  }

  /**
   * Create new product (Admin only)
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Product | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.PRODUCTS_TABLE)
        .insert([product])
        .select()
        .single();

      if (error) {
        console.error('Create product error:', error);
        return { data: null, error };
      }

      return { data: data as Product, error: null };
    } catch (error) {
      console.error('Create product exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Update product (Admin only)
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<{ data: Product | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.PRODUCTS_TABLE)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Update product ${id} error:`, error);
        return { data: null, error };
      }

      return { data: data as Product, error: null };
    } catch (error) {
      console.error(`Update product ${id} exception:`, error);
      return { data: null, error };
    }
  }

  /**
   * Delete product (Admin only)
   */
  async deleteProduct(id: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from(this.PRODUCTS_TABLE)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Delete product ${id} error:`, error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error(`Delete product ${id} exception:`, error);
      return { error };
    }
  }

  /**
   * Subscribe to real-time product changes
   * Note: For real-time updates, ensure your Supabase tables have proper RLS policies
   */
  subscribeToProducts(callback: (products: Product[]) => void): () => void {
    // Subscribe to changes using Supabase realtime channel
    const channel = this.supabase
      .channel(`public:${this.PRODUCTS_TABLE}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.PRODUCTS_TABLE },
        () => {
          // Refetch products on any change
          this.getProducts().then(({ data }) => {
            if (data) callback(data);
          });
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Fetch all orders for a specific user (both active and past)
   */
  async getUserOrders(userEmail: string): Promise<{ data: Order[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.ORDERS_TABLE)
        .select('*')
        .eq('user_email', userEmail)
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Fetch user orders error:', error);
        return { data: null, error };
      }

      return { data: (data as Order[]) || [], error: null };
    } catch (error) {
      console.error('Fetch user orders exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch active orders for a specific user (Pending, Making, Ready)
   */
  async getUserActiveOrders(userEmail: string): Promise<{ data: Order[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.ORDERS_TABLE)
        .select('*')
        .eq('customer_email', userEmail)
        .in('status', ['Pending', 'Making', 'Ready'])
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Fetch active orders error:', error);
        return { data: null, error };
      }

      return { data: (data as Order[]) || [], error: null };
    } catch (error) {
      console.error('Fetch active orders exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch past orders for a specific user (Delivered)
   */
  async getUserPastOrders(userEmail: string): Promise<{ data: Order[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.ORDERS_TABLE)
        .select('*')
        .eq('customer_email', userEmail)
        .eq('status', 'Delivered')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Fetch past orders error:', error);
        return { data: null, error };
      }

      return { data: (data as Order[]) || [], error: null };
    } catch (error) {
      console.error('Fetch past orders exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Insert a new order into the database
   */
  async insertOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Order | null; error: any }> {
    try {
      console.log('[SupabaseService] Inserting order:', order);
      
      const { data, error } = await this.supabase
        .from(this.ORDERS_TABLE)
        .insert([order])
        .select()
        .single();

      if (error) {
        console.error('[SupabaseService] Insert order error:', error);
        return { data: null, error };
      }

      console.log('[SupabaseService] Order inserted successfully:', data);
      return { data: data as Order, error: null };
    } catch (error) {
      console.error('[SupabaseService] Insert order exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetch all orders (Admin only)
   */
  async getAllOrders(): Promise<{ data: Order[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.ORDERS_TABLE)
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('[SupabaseService] Fetch all orders error:', error);
        return { data: null, error };
      }

      return { data: (data as Order[]) || [], error: null };
    } catch (error) {
      console.error('[SupabaseService] Fetch all orders exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Add or update item in user's cart
   */
  async addItemToCart(
    userEmail: string,
    productId: string,
    productName: string,
    price: number,
    imageUrl: string,
    quantity: number = 1
  ): Promise<{ data: any; error: any }> {
    try {
      // Check if item already exists in cart
      const { data: existingItem, error: selectError } = await this.supabase
        .from(this.USER_CARTS_TABLE)
        .select('*')
        .eq('user_email', userEmail)
        .eq('product_id', productId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not found)
        console.error('[SupabaseService] Error checking cart item:', selectError);
        return { data: null, error: selectError };
      }

      if (existingItem) {
        // Update existing item quantity
        const { data, error } = await this.supabase
          .from(this.USER_CARTS_TABLE)
          .update({ quantity: existingItem.quantity + quantity })
          .eq('user_email', userEmail)
          .eq('product_id', productId)
          .select()
          .single();

        if (error) {
          console.error('[SupabaseService] Error updating cart item:', error);
          return { data: null, error };
        }

        console.log('[SupabaseService] Cart item updated:', data);
        return { data, error: null };
      } else {
        // Insert new cart item
        const { data, error } = await this.supabase
          .from(this.USER_CARTS_TABLE)
          .insert([
            {
              user_email: userEmail,
              product_id: productId,
              product_name: productName,
              price,
              image_url: imageUrl,
              quantity,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('[SupabaseService] Error adding cart item:', error);
          return { data: null, error };
        }

        console.log('[SupabaseService] Cart item added:', data);
        return { data, error: null };
      }
    } catch (error) {
      console.error('[SupabaseService] Exception adding item to cart:', error);
      return { data: null, error };
    }
  }

  /**
   * Get cart items for a specific user
   */
  async getCartItems(userEmail: string): Promise<{ data: any[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.USER_CARTS_TABLE)
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SupabaseService] Error fetching cart items:', error);
        return { data: null, error };
      }

      console.log('[SupabaseService] Cart items fetched for', userEmail, ':', data?.length || 0, 'items');
      return { data: data || [], error: null };
    } catch (error) {
      console.error('[SupabaseService] Exception fetching cart items:', error);
      return { data: null, error };
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(userEmail: string, productId: string, quantity: number): Promise<{ data: any; error: any }> {
    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return this.removeCartItem(userEmail, productId);
      }

      const { data, error } = await this.supabase
        .from(this.USER_CARTS_TABLE)
        .update({ quantity })
        .eq('user_email', userEmail)
        .eq('product_id', productId)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseService] Error updating cart item quantity:', error);
        return { data: null, error };
      }

      console.log('[SupabaseService] Cart item quantity updated:', data);
      return { data, error: null };
    } catch (error) {
      console.error('[SupabaseService] Exception updating cart item quantity:', error);
      return { data: null, error };
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(userEmail: string, productId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from(this.USER_CARTS_TABLE)
        .delete()
        .eq('user_email', userEmail)
        .eq('product_id', productId)
        .select();

      if (error) {
        console.error('[SupabaseService] Error removing cart item:', error);
        return { data: null, error };
      }

      console.log('[SupabaseService] Cart item removed');
      return { data, error: null };
    } catch (error) {
      console.error('[SupabaseService] Exception removing cart item:', error);
      return { data: null, error };
    }
  }

  /**
   * Clear entire cart for a user
   */
  async clearUserCart(userEmail: string): Promise<{ error: any }> {
    try {
      const { error } = await this.supabase
        .from(this.USER_CARTS_TABLE)
        .delete()
        .eq('user_email', userEmail);

      if (error) {
        console.error('[SupabaseService] Error clearing cart:', error);
        return { error };
      }

      console.log('[SupabaseService] Cart cleared for user:', userEmail);
      return { error: null };
    } catch (error) {
      console.error('[SupabaseService] Exception clearing cart:', error);
      return { error };
    }
  }
}
