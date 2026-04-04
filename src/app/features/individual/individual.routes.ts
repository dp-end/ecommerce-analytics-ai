import { Routes } from '@angular/router';
import { IndividualShellComponent } from './individual';

export const individualRoutes: Routes = [
  {
    path: '',
    component: IndividualShellComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home').then(m => m.IndividualHomeComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders').then(m => m.IndividualOrdersComponent),
      },
      {
        path: 'cart',
        loadComponent: () => import('./pages/cart/cart').then(m => m.IndividualCartComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then(m => m.IndividualProfileComponent),
      },
      {
        path: 'chatbot',
        loadComponent: () => import('../chatbot/chatbot').then(m => m.ChatbotComponent),
      },
    ],
  },
];
