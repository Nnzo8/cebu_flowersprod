import { Routes } from '@angular/router';
import { Login } from './login/login';
import { RegisterComponent } from './register/register';

export const authRoutes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
