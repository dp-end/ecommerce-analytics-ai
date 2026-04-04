import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-individual-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class IndividualProfileComponent {
  authService = inject(AuthService);
  cartService = inject(CartService);

  user = this.authService.currentUser;

  editMode = signal(false);
  saveSuccess = signal(false);

  editName = signal('');
  editEmail = signal('');

  notifications = signal({
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    sms: false,
  });

  stats = [
    { icon: '📦', label: 'Total Orders', value: '24' },
    { icon: '🛒', label: 'Cart Items', value: String(this.cartService.count()) },
    { icon: '💳', label: 'Total Spent', value: '$1,284' },
    { icon: '⭐', label: 'Reviews Left', value: '8' },
  ];

  recentOrders = [
    { id: '#ORD-001', date: 'Dec 28, 2024', items: 3, total: '$267.40', status: 'delivered' },
    { id: '#ORD-002', date: 'Jan 05, 2025', items: 1, total: '$89.20', status: 'shipped' },
    { id: '#ORD-003', date: 'Jan 14, 2025', items: 2, total: '$134.00', status: 'processing' },
  ];

  startEdit(): void {
    const u = this.user();
    this.editName.set(u?.name ?? '');
    this.editEmail.set(u?.email ?? '');
    this.editMode.set(true);
  }

  cancelEdit(): void {
    this.editMode.set(false);
  }

  saveProfile(): void {
    this.editMode.set(false);
    this.saveSuccess.set(true);
    setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  toggleNotification(key: keyof ReturnType<typeof this.notifications>): void {
    this.notifications.update(n => ({ ...n, [key]: !n[key] }));
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      delivered: 'badge-green',
      shipped: 'badge-blue',
      processing: 'badge-yellow',
      cancelled: 'badge-red',
    };
    return map[status] ?? 'badge-gray';
  }
}
