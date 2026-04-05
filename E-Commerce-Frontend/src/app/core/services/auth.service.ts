import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole } from '../models/user.model';

const EMAIL_ROLE_MAP: Record<string, UserRole> = {
  'admin@datapulse.io': 'admin',
  'corp@datapulse.io': 'corporate',
};

const MOCK_USERS: Record<UserRole, Omit<User, 'email'>> = {
  admin: { id: 1, name: 'Alex Admin', role: 'admin' },
  corporate: { id: 2, name: 'Mağaza Yöneticisi', role: 'corporate' },
  individual: { id: 3, name: 'Kullanıcı', role: 'individual' },
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

  login(email: string, password: string): boolean {
    if (!email || !password) return false;

    const role: UserRole = EMAIL_ROLE_MAP[email.toLowerCase()] ?? 'individual';
    const base = MOCK_USERS[role];

    const loggedUser: User = { ...base, email };
    this.currentUser.set(loggedUser);
    localStorage.setItem('datapulse_user', JSON.stringify(loggedUser));
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('datapulse_user');
  }

  getCurrentRole(): UserRole | null {
    return this.currentUser()?.role ?? null;
  }
}
