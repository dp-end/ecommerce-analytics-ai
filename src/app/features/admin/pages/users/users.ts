import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockUser } from '../../../../core/services/mock-data.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class AdminUsersComponent {
  private mockData = inject(MockDataService);

  searchQuery = signal('');
  roleFilter = signal('all');
  users = signal<MockUser[]>(this.mockData.getUsers());

  filteredUsers = computed(() => {
    let list = this.users();
    if (this.roleFilter() !== 'all') {
      list = list.filter(u => u.role === this.roleFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  });

  getRoleBadge(role: string): string {
    return { admin: 'badge-red', corporate: 'badge-blue', individual: 'badge-green' }[role] || 'badge-gray';
  }

  toggleStatus(user: MockUser): void {
    this.users.update(users =>
      users.map(u => u.id === user.id
        ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
        : u
      )
    );
  }

  deleteUser(id: number): void {
    this.users.update(users => users.filter(u => u.id !== id));
  }
}
