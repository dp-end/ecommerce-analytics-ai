import { Component, HostBinding, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MobileMenuService } from '../../core/services/mobile-menu.service';
import { UserRole } from '../../core/models/user.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  @Input() role: UserRole = 'individual';

  private authService = inject(AuthService);
  private mobileMenu = inject(MobileMenuService);
  private router = inject(Router);

  user = computed(() => this.authService.currentUser());

  @HostBinding('class.mobile-open')
  get mobileOpen(): boolean {
    return this.mobileMenu.isOpen();
  }

  navItems = computed((): NavItem[] => {
    switch (this.role) {
      case 'admin':
        return [
          { label: 'Dashboard',   icon: '📊', route: '/admin/dashboard' },
          { label: 'Users',       icon: '👥', route: '/admin/users' },
          { label: 'Stores',      icon: '🏪', route: '/admin/stores' },
          { label: 'Categories',  icon: '🗂️', route: '/admin/categories' },
          { label: 'Analytics',   icon: '📈', route: '/admin/analytics' },
          { label: 'Audit Logs',  icon: '📋', route: '/admin/audit-logs' },
          { label: 'AI Assistant',icon: '🤖', route: '/admin/chatbot' },
        ];
      case 'corporate':
        return [
          { label: 'Dashboard', icon: '📊', route: '/corporate/dashboard' },
          { label: 'AI Assistant', icon: '🤖', route: '/corporate/chatbot' },
          { label: 'Analytics', icon: '📈', route: '/corporate/analytics' },
          { label: 'Orders', icon: '📦', route: '/corporate/orders' },
          { label: 'Products', icon: '🛍️', route: '/corporate/products' },
          { label: 'Customers', icon: '👤', route: '/corporate/customers' },
          { label: 'Shipments', icon: '🚚', route: '/corporate/shipments' },
          { label: 'Reviews', icon: '⭐', route: '/corporate/reviews' },
        ];
      case 'individual':
        return [
          { label: 'Home', icon: '🏠', route: '/individual/home' },
          { label: 'AI Assistant', icon: '🤖', route: '/individual/chatbot' },
          { label: 'My Orders', icon: '📦', route: '/individual/orders' },
          { label: 'Favorites', icon: '❤️', route: '/individual/favorites' },
          { label: 'Cart', icon: '🛒', route: '/individual/cart' },
          { label: 'Profile', icon: '👤', route: '/individual/profile' },
        ];
      default:
        return [];
    }
  });

  closeMobileMenu(): void {
    this.mobileMenu.close();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRoleLabel(): string {
    switch (this.role) {
      case 'admin': return 'Administrator';
      case 'corporate': return 'Corporate';
      case 'individual': return 'Individual';
    }
  }

  getInitials(): string {
    const name = this.user()?.name ?? 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
