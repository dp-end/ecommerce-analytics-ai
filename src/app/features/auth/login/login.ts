import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  role = signal<UserRole>('admin');
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);

  demoCredentials: Record<UserRole, string> = {
    admin: 'admin@datapulse.io',
    corporate: 'corp@datapulse.io',
    individual: 'user@datapulse.io',
  };

  selectRole(r: UserRole): void {
    this.role.set(r);
    this.email.set(this.demoCredentials[r]);
  }

  async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.error.set('Please fill in all fields.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    await new Promise(r => setTimeout(r, 600));

    const success = this.authService.login(this.email(), this.password(), this.role());

    if (success) {
      switch (this.role()) {
        case 'admin':
          this.router.navigate(['/admin/dashboard']);
          break;
        case 'corporate':
          this.router.navigate(['/corporate/dashboard']);
          break;
        case 'individual':
          this.router.navigate(['/individual/home']);
          break;
      }
    } else {
      this.error.set('Invalid credentials. Please try again.');
    }

    this.loading.set(false);
  }
}
