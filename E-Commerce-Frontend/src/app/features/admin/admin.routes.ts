import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then(m => m.AdminUsersComponent),
      },
      {
        path: 'stores',
        loadComponent: () => import('./pages/stores/stores').then(m => m.AdminStoresComponent),
      },
      {
        path: 'stores/:id',
        loadComponent: () => import('../individual/pages/store-detail/store-detail').then(m => m.StoreDetailComponent),
      },
      {
        path: 'product/:id',
        loadComponent: () => import('../individual/pages/product-detail/product-detail').then(m => m.ProductDetailComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./pages/categories/categories').then(m => m.AdminCategoriesComponent),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/analytics/analytics').then(m => m.AdminAnalyticsComponent),
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./pages/audit-logs/audit-logs').then(m => m.AdminAuditLogsComponent),
      },
      {
        path: 'chatbot',
        loadComponent: () => import('../chatbot/chatbot').then(m => m.ChatbotComponent),
      },
    ],
  },
];
