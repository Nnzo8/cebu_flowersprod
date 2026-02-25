import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';
import { Dashboard } from './dashboard/dashboard';
import { Inventory } from './inventory/inventory';
import { ManageOrders } from './manage-orders/manage-orders';

/**
 * Admin feature routes
 * All routes are protected by the adminGuard which checks:
 * 1. User is authenticated
 * 2. User has 'admin' role
 */
export const adminRoutes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [adminGuard],
    data: { title: 'Admin Dashboard' },
  },
  {
    path: 'inventory',
    component: Inventory,
    canActivate: [adminGuard],
    data: { title: 'Products Management' },
  },
  {
    path: 'manage-orders',
    component: ManageOrders,
    canActivate: [adminGuard],
    data: { title: 'Orders Management' },
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
