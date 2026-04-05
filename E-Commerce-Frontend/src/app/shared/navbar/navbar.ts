import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  user = computed(() => this.authService.currentUser());
  searchQuery = signal('');
  showNotifications = signal(false);

  notifications = [
    { id: 1, text: 'New order received #ORD-7850', time: '2 min ago', read: false },
    { id: 2, text: 'System backup completed', time: '1h ago', read: false },
    { id: 3, text: 'Monthly report ready to download', time: '3h ago', read: true },
    { id: 4, text: 'New user registered', time: '5h ago', read: true },
  ];

  unreadCount = computed(() => this.notifications.filter(n => !n.read).length);

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

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
  }

  markAllRead(): void {
    this.notifications.forEach(n => n.read = true);
  }
}
