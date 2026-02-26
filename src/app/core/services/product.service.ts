import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MonoTypeOperatorFunction, timer, pipe, throwError, map, of } from 'rxjs';
import { retry, timeout, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Define the Product interface for type safety across the application
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  
  // The Supabase REST API endpoint for the products table
  // Built from environment variables so it works across dev/prod environments
  private readonly supabaseUrl = `${environment.supabase.url}/rest/v1/products`;

  // Cache for all products (used for client-side filtering by ID)
  private cachedProducts: Product[] = [];

  // HttpClient is injected to make HTTP requests to the Supabase REST API
  constructor(private http: HttpClient) {}

  /**
   * Fetch all products from the API
   * Uses retry logic and timeout protection
   * Caches results for client-side filtering (GET by ID)
   * @returns Observable<Product[]> - Array of all products
   */
  getProducts(): Observable<Product[]> {
    // Adding ?select=* tells Supabase to return all columns
    return this.http.get<Product[]>(`${this.supabaseUrl}?select=*`).pipe(
      this.applyRetryLogic('Fetch all products'),
      map(products => {
        // Store the fetched products in cache
        this.cachedProducts = products;
        return products;
      })
    );
  }
  /**
   * Fetch a single product by ID
   * Uses client-side filtering from cached products
   * If cache is empty, fetches all products first then filters
   * @param id - Product ID to fetch
   * @returns Observable<Product> - Single product object or error if not found
   */
  getProductById(id: string): Observable<Product> {
    // Validate ID is provided
    if (!id || id.trim() === '') {
      return throwError(() => new Error('Invalid product ID provided'));
    }

    // If we have cached products, filter locally and return immediately
    if (this.cachedProducts.length > 0) {
      const product = this.cachedProducts.find(p => p.id === id);
      if (product) {
        return of(product);
      }
      // Product not found in cache
      return throwError(() => new Error(`Product with ID "${id}" not found`));
    }

    // If cache is empty, fetch all products first, then filter for the one we need
    return this.getProducts().pipe(
      map(products => {
        const product = products.find(p => p.id === id);
        if (!product) {
          throw new Error(`Product with ID "${id}" not found`);
        }
        return product;
      }),
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          return throwError(() => error);
        }
        return throwError(() => new Error(error.message || 'Failed to find product'));
      })
    );
  }

  /**
   * Create a new product (Admin only)
   * Requires valid Bearer token in Authorization header
   * @param product - Partial product data (reuses Product interface)
   * @returns Observable<Product> - Created product with generated ID
   */
  createProduct(product: Partial<Product>): Observable<Product> {
    // Prefer: return=representation tells Supabase to send the created object back in the response
    const headers = new HttpHeaders().set('Prefer', 'return=representation');

    return this.http.post<Product[]>(this.supabaseUrl, product, { headers }).pipe(
      map(response => response[0]), // Supabase returns an array for inserts, we grab the first item
      this.applyRetryLogic('Create product'),
      catchError(error => this.handleAuthError(error, 'Create product'))
    );
  }

  /**
   * Update an existing product (Admin only)
   * Modifies product data at the given ID
   * @param id - Product ID to update
   * @param product - Partial product data to merge with existing record
   * @returns Observable<Product> - Updated product object
   */
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    const headers = new HttpHeaders().set('Prefer', 'return=representation');

    // 2. Use PATCH instead of PUT. 
    // 3. Use ?id=eq.${id} to target the specific row
    return this.http.patch<Product[]>(
      `${this.supabaseUrl}?id=eq.${id}`, // ?id=eq.${id} is Supabase's filter syntax
      product,
      { headers }
    ).pipe(
      map(response => response[0]),
      this.applyRetryLogic(`Update product ${id}`),
      catchError(error => this.handleAuthError(error, `Update product ${id}`))
    );
  }

  /**
   * Delete a product (Admin only)
   * Permanently removes a product from the database
   * @param id - Product ID to delete
   * @returns Observable<void> - Confirmation of deletion
   */
  deleteProduct(id: string): Observable<void> {
    // 3. Use ?id=eq.${id} to target the specific row
    return this.http.delete<void>(`${this.supabaseUrl}?id=eq.${id}`).pipe(
      this.applyRetryLogic(`Delete product ${id}`),
      catchError(error => this.handleAuthError(error, `Delete product ${id}`))
    );
  }

  /**
   * Private helper: DRY retry logic with timeout and exponential backoff
   * Shared across all HTTP methods to avoid code duplication
   */
  private applyRetryLogic<T>(operationName: string): MonoTypeOperatorFunction<T> {
    // Notice we return pipe(...) instead of an array [...]
    return pipe(
      timeout(10000),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Good practice: Don't retry 4xx errors (like 401 Auth or 404 Not Found)
          // Retrying won't fix a missing token!
          if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
            return throwError(() => error);
          }
          const delayMs = Math.pow(2, retryCount) * 1000;
          console.warn(`[${operationName}] Retry attempt ${retryCount + 1}`);
          return timer(delayMs);
        },
      }),
      catchError(error => {
        // If it's an HTTP error, pass it down so handleAuthError can read the .status
        if (error instanceof HttpErrorResponse) {
          return throwError(() => error);
        }
        // Otherwise, it was a timeout or network crash
        console.error(`[${operationName}] Generic failure:`, error);
        return throwError(() => new Error('Failed to load products. Please try again later.'));
      })
    );
  }

  /**
   * Private helper: Handle authentication-specific errors
   * Provides user-friendly error messages for auth failures
   * @param error - HTTP error object from the request
   * @param operationName - Name of operation for logging
   * @returns Observable that throws a user-friendly error message
   */
  private handleAuthError(error: any, operationName: string): Observable<never> {
    // Different error messages based on HTTP status code
    let userMessage = 'Failed to load products. Please try again later.';

    if (error.status === 401) {
      // 401 = Unauthorized - invalid or missing token
      userMessage = 'Authentication failed. Please check your admin credentials.';
      console.error(`[${operationName}] Unauthorized (401):`, error);
    } else if (error.status === 403) {
      // 403 = Forbidden - token valid but user lacks permission
      userMessage = 'You do not have permission to perform this action.';
      console.error(`[${operationName}] Forbidden (403):`, error);
    } else if (error.status === 404) {
      // 404 = Not Found - resource doesn't exist
      userMessage = 'Product not found.';
      console.error(`[${operationName}] Not Found (404):`, error);
    } else if (error.status >= 500) {
      // 5xx = Server error
      userMessage = 'Server error. Please try again later.';
      console.error(`[${operationName}] Server Error (${error.status}):`, error);
    }

    return throwError(() => new Error(userMessage));
  }
}
