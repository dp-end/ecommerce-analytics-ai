import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = signal('');
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.name() || !this.email() || !this.password()) {
      this.error.set('Lütfen tüm alanları doldurun.');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    await new Promise(r => setTimeout(r, 700));

    const success = this.authService.login(this.email(), this.password());

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
      this.error.set('Kayıt başarısız. Lütfen tekrar deneyin.');
    }

    this.loading.set(false);
  }
}
