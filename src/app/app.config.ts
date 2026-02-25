import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter,withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { SupabaseService } from './core/services/supabase.service';
import { routes } from './app.routes';

/**
 * Initialize Supabase session on app startup
 * This ensures the session is restored before the app renders
 */
export function initializeSupabaseSession(supabaseService: SupabaseService): () => Promise<void> {
  return () => supabaseService.initSupabaseSession();
}

// Application-wide configuration including HTTP setup and routing
export const appConfig: ApplicationConfig = {
  providers: [

    provideRouter(routes, withPreloading(PreloadAllModules)),
    // Enable browser global error listeners for debugging
    provideBrowserGlobalErrorListeners(),
    
    // Initialize Supabase session before app bootstrap
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSupabaseSession,
      deps: [SupabaseService],
      multi: true,
    },
    
    // Enable routing throughout the application
    provideRouter(routes),
    
    // Configure HttpClient with interceptors
    // Interceptors are middleware that runs on every HTTP request/response
    provideHttpClient(
      // Apply auth interceptor to automatically inject Bearer token on protected routes
      withInterceptors([authInterceptor])
    ),
  ]
};
