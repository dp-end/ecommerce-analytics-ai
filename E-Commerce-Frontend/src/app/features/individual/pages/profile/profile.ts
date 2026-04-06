import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { ApiService } from '../../../../core/services/api.service';
import { OrderDto, CustomerProfileDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-individual-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class IndividualProfileComponent implements OnInit {
  authService = inject(AuthService);
  cartService = inject(CartService);
  private api = inject(ApiService);

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

  profile = signal<CustomerProfileDto | null>(null);
  recentOrders = signal<OrderDto[]>([]);

  stats = signal([
    { icon: '📦', label: 'Total Orders', value: '0' },
    { icon: '🛒', label: 'Cart Items', value: '0' },
    { icon: '💳', label: 'Total Spent', value: '$0' },
    { icon: '⭐', label: 'Reviews Left', value: '0' },
  ]);

  ngOnInit(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    this.api.getMyOrders().subscribe({
      next: orders => {
        this.recentOrders.set(orders.slice(0, 3));
        this.stats.update(s => s.map(st =>
          st.label === 'Total Orders' ? { ...st, value: String(orders.length) } :
          st.label === 'Cart Items' ? { ...st, value: String(this.cartService.count()) } :
          st.label === 'Total Spent' ? { ...st, value: '$' + orders.reduce((sum, o) => sum + o.grandTotal, 0).toFixed(0) } :
          st
        ));
      },
    });

    this.api.getUserProfile(currentUser.id).subscribe({
      next: p => this.profile.set(p),
    });
  }

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
      completed: 'badge-green', shipped: 'badge-blue',
      processing: 'badge-yellow', cancelled: 'badge-red',
    };
    return map[status.toLowerCase()] ?? 'badge-gray';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }
}
