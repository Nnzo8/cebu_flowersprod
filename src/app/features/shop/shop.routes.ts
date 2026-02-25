import { Routes } from '@angular/router';
import { Catalog } from './catalog/catalog';
import { Cart } from './cart/cart';
import { Contact } from './contact/contact';
import { Checkout } from './checkout/checkout';
import { Home } from './home/home';

export const shopRoutes: Routes = [
  { path: 'home', component: Home },
  { path: 'catalog', component: Catalog },
  { path: 'cart', component: Cart },
  { path: 'checkout', component: Checkout },
  { path: 'contact', component: Contact },
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },
];