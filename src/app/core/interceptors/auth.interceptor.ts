import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';
import { environment } from '../../../environments/environment'; // <-- Don't forget this import!

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // Get the current session to access the user's JWT token
  const session = supabaseService.getSessionSync();
  
  let activeToken = environment.supabase.anonKey; // Default to public key
  
  // If user is logged in, use their session access token instead of anonKey
  if (session && session.access_token) {
    activeToken = session.access_token; // Use user's JWT token for authenticated requests
  }

  // Clone the request and add required Supabase headers
  const authenticatedReq = req.clone({
    setHeaders: {
      apikey: environment.supabase.anonKey,       // This MUST ALWAYS be the public anon key
      Authorization: `Bearer ${activeToken}`, // Use session token if logged in, otherwise anonKey
    },
  });

  // 4. Pass the modified request to the next handler
  return next(authenticatedReq).pipe(
    catchError(error => {
      if (error.status === 401) {
        console.error('[AuthInterceptor] Unauthorized: Invalid or expired token');
        authService.logout();
      } else if (error.status === 403) {
        console.error('[AuthInterceptor] Forbidden: User lacks permission');
        // You might not want to log them out for a 403, just block the action, 
        // but keeping your logout logic here is fine for now!
        authService.logout(); 
      }
      
      return throwError(() => error);
    })
  );
};