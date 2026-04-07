import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { AuthResponse } from '../models/api.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem('datapulse_user');
      if (stored) {
        this.currentUser.set(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem('datapulse_user');
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, { email, password })
      );
      this.saveSession(res);
      return true;
    } catch {
      return false;
    }
  }

  async register(name: string, email: string, password: string, roleType: string = 'INDIVIDUAL'): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/register`, { name, email, password, roleType })
      );
      this.saveSession(res);
      return true;
    } catch {
      return false;
    }
  }

  private saveSession(res: AuthResponse): void {
    const role = res.role.toLowerCase() as UserRole;
    const user: User = { id: res.id, name: res.name, email: res.email, role, avatar: res.avatar };
    localStorage.setItem('datapulse_token', res.token);
    localStorage.setItem('datapulse_user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('datapulse_user');
    localStorage.removeItem('datapulse_token');
  }

  getCurrentRole(): UserRole | null {
    return this.currentUser()?.role ?? null;
  }
}
