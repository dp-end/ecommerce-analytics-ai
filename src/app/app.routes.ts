import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'corporate',
    canActivate: [authGuard, roleGuard],
    data: { role: 'corporate' },
    loadChildren: () => import('./features/corporate/corporate.routes').then(m => m.corporateRoutes),
  },
  {
    path: 'individual',
    canActivate: [authGuard, roleGuard],
    data: { role: 'individual' },
    loadChildren: () => import('./features/individual/individual.routes').then(m => m.individualRoutes),
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
