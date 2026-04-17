import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  @Input() pageTitle = 'Dashboard';

  private authService = inject(AuthService);
  private router = inject(Router);

  user = computed(() => this.authService.currentUser());
  searchQuery = signal('');
  showNotifications = signal(false);

  notifications = signal([
    { id: 1, text: 'New order received #ORD-7850', time: '2 min ago', read: false },
    { id: 2, text: 'System backup completed', time: '1h ago', read: false },
    { id: 3, text: 'Monthly report ready to download', time: '3h ago', read: true },
    { id: 4, text: 'New user registered', time: '5h ago', read: true },
  ]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  getInitials(): string {
    const name = this.user()?.name ?? 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getRoleBadgeClass(): string {
    switch (this.user()?.role) {
      case 'admin': return 'badge-red';
      case 'corporate': return 'badge-blue';
      case 'individual': return 'badge-green';
      default: return 'badge-gray';
    }
  }

  getRoleLabel(): string {
    switch (this.user()?.role) {
      case 'admin': return 'Admin';
      case 'corporate': return 'Corporate';
      case 'individual': return 'User';
      default: return '';
    }
  }

  onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
  }

  submitSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;
    const role = this.user()?.role;
    if (role === 'individual') {
      this.router.navigate(['/individual/home'], { queryParams: { search: q } });
    } else if (role === 'admin') {
      this.router.navigate(['/admin/users'], { queryParams: { search: q } });
    } else if (role === 'corporate') {
      this.router.navigate(['/corporate/products'], { queryParams: { search: q } });
    }
    this.searchQuery.set('');
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  markNotificationRead(id: number): void {
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }
}
