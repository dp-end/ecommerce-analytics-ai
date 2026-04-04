import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';

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
  role = signal<UserRole>('individual');
  error = signal('');
  loading = signal(false);
  success = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.name() || !this.email() || !this.password()) {
      this.error.set('Please fill in all fields.');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    await new Promise(r => setTimeout(r, 800));

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
      this.error.set('Registration failed. Please try again.');
    }

    this.loading.set(false);
  }
}
