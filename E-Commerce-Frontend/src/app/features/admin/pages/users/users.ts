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

  searchQuery = signal('');
  roleFilter = signal('all');
  users = signal<UserDto[]>([]);
  loading = signal(false);

  filteredUsers = computed(() => {
    let list = this.users();
    if (this.roleFilter() !== 'all') {
      list = list.filter(u => u.roleType.toLowerCase() === this.roleFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getUsers().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
      next: updated => this.users.update(users => users.map(u => u.id === updated.id ? updated : u)),
    });
  }

  deleteUser(id: number): void {
    this.api.deleteUser(id).subscribe({
      next: () => this.users.update(users => users.filter(u => u.id !== id)),
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
