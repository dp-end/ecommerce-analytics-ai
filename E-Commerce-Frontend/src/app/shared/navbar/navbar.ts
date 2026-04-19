import { Component, Input, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { MobileMenuService } from '../../core/services/mobile-menu.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() pageTitle = 'Dashboard';

  private authService = inject(AuthService);
  private router = inject(Router);
  favoritesService = inject(FavoritesService);
  private mobileMenu = inject(MobileMenuService);
  private notificationService = inject(NotificationService);
  private notifSub?: Subscription;

  user = computed(() => this.authService.currentUser());
  isIndividual = computed(() => this.user()?.role === 'individual');
  favCount = computed(() => this.favoritesService.count());
  showNotifications = signal(false);

  notifications = signal([
    { id: 1, text: 'New order received #ORD-7850', time: '2 min ago', read: false },
    { id: 2, text: 'System backup completed', time: '1h ago', read: false },
    { id: 3, text: 'Monthly report ready to download', time: '3h ago', read: true },
    { id: 4, text: 'New user registered', time: '5h ago', read: true },
  ]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  ngOnInit(): void {
    this.notifSub = this.notificationService.notifications$.subscribe(msg => {
      this.notifications.update(list => [
        { id: msg.id, text: msg.text, time: 'Şimdi', read: false },
        ...list,
      ]);
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

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
      case 'individual': return 'Individual';
      default: return '';
    }
  }

  goToFavorites(): void {
    this.router.navigate(['/individual/favorites']);
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

  toggleMobileMenu(): void {
    this.mobileMenu.toggle();
  }
}
