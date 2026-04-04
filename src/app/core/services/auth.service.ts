import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole } from '../models/user.model';

const MOCK_USERS: Record<string, User> = {
  admin: {
    id: 1,
    email: 'admin@datapulse.io',
    name: 'Alex Admin',
    role: 'admin',
  },
  corporate: {
    id: 2,
    email: 'corp@datapulse.io',
    name: 'Corporate User',
    role: 'corporate',
  },
  individual: {
    id: 3,
    email: 'user@datapulse.io',
    name: 'John Doe',
    role: 'individual',
  },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem('datapulse_user');
      if (stored) {
        const user: User = JSON.parse(stored);
        this.currentUser.set(user);
      }
    } catch {
      localStorage.removeItem('datapulse_user');
    }
  }

  login(email: string, password: string, role: UserRole): boolean {
    const user = MOCK_USERS[role];
    if (user) {
      const loggedUser: User = { ...user, email };
      this.currentUser.set(loggedUser);
      localStorage.setItem('datapulse_user', JSON.stringify(loggedUser));
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('datapulse_user');
  }

  getCurrentRole(): UserRole | null {
    return this.currentUser()?.role ?? null;
  }
}
