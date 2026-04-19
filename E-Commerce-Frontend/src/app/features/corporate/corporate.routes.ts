import { Routes } from '@angular/router';
import { CorporateShellComponent } from './corporate';

export const corporateRoutes: Routes = [
  {
    path: '',
    component: CorporateShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.CorporateDashboardComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products').then(m => m.CorporateProductsComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders').then(m => m.CorporateOrdersComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/customers/customers').then(m => m.CorporateCustomersComponent),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/analytics/analytics').then(m => m.CorporateAnalyticsComponent),
      },
      {
        path: 'shipments',
        loadComponent: () => import('./pages/shipments/shipments').then(m => m.CorporateShipmentsComponent),
      },
      {
        path: 'reviews',
        loadComponent: () => import('./pages/reviews/reviews').then(m => m.CorporateReviewsComponent),
      },
      {
        path: 'store/:id',
        loadComponent: () => import('../individual/pages/store-detail/store-detail').then(m => m.StoreDetailComponent),
      },
      {
        path: 'product/:id',
        loadComponent: () => import('../individual/pages/product-detail/product-detail').then(m => m.ProductDetailComponent),
      },
      {
        path: 'chatbot',
        loadComponent: () => import('../chatbot/chatbot').then(m => m.ChatbotComponent),
      },
    ],
  },
];
