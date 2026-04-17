import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { UserDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService);

  searchQuery  = signal('');
  roleFilter   = signal('');
  users        = signal<UserDto[]>([]);
  loading      = signal(false);

  currentPage    = signal(0);
  totalPages     = signal(0);
  totalElements  = signal(0);
  readonly pageSize = 50;

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(page = 0): void {
    this.loading.set(true);
    this.currentPage.set(page);
    this.api.getUsers(page, this.pageSize, this.searchQuery(), this.roleFilter()).subscribe({
      next: res => {
        this.users.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(0), 350);
  }

  onRoleChange(value: string): void {
    this.roleFilter.set(value.toUpperCase());
    this.load(0);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) this.load(page);
  }

  getRoleBadge(role: string): string {
    const r = role.toLowerCase();
    return { admin: 'badge-red', corporate: 'badge-blue', individual: 'badge-green' }[r] || 'badge-gray';
  }

  getStatusBadge(status: string): string {
    return status.toUpperCase() === 'ACTIVE' ? 'badge-green' : 'badge-red';
  }

  toggleStatus(user: UserDto): void {
    const newStatus = user.status.toUpperCase() === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.api.updateUserStatus(user.id, newStatus).subscribe({
      next: updated => this.users.update(list => list.map(u => u.id === updated.id ? updated : u)),
    });
  }

  deleteUser(id: number): void {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    this.api.deleteUser(id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== id));
        this.totalElements.update(n => n - 1);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Kullanıcı silinemedi. İlişkili siparişleri veya verileri olabilir.';
        alert(msg);
      },
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
