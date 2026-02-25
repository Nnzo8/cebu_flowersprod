import { Routes } from '@angular/router';

export const routes: Routes = [
  {
  path: 'auth',
  loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'shop',
    loadChildren: () => import('./features/shop/shop.routes').then(m => m.shopRoutes)
  },
  { 
    path: '', 
    loadComponent: () => import('./features/shop/home/home').then(m => m.Home) 
  },
  { path: '**', redirectTo: '' } //wildcard route to catch undefined paths and redirect to home
];
