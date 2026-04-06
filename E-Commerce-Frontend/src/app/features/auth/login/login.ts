import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.error.set('Lütfen tüm alanları doldurun.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const success = await this.authService.login(this.email(), this.password());

    if (success) {
      const role = this.authService.getCurrentRole();
      switch (role) {
        case 'admin':
          this.router.navigate(['/admin/dashboard']);
          break;
        case 'corporate':
          this.router.navigate(['/corporate/dashboard']);
          break;
        default:
          this.router.navigate(['/individual/home']);
      }
    } else {
      this.error.set('Giriş başarısız. E-posta veya şifre hatalı.');
    }

    this.loading.set(false);
  }
}
