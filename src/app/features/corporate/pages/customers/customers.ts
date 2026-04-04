import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockCustomer } from '../../../../core/services/mock-data.service';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';

@Component({
  selector: 'app-corporate-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class CorporateCustomersComponent {
  private mockData = inject(MockDataService);

  customers = signal<MockCustomer[]>(this.mockData.getCustomers());
  searchQuery = signal('');
  membershipFilter = signal('all');

  filteredCustomers = computed(() => {
    let list = this.customers();
    if (this.membershipFilter() !== 'all') {
      list = list.filter(c => c.membership === this.membershipFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    return list;
  });

  getMembershipBadge(membership: string): string {
    const map: Record<string, string> = {
      gold: 'badge-yellow',
      silver: 'badge-gray',
      bronze: 'badge-orange',
    };
    return map[membership] || 'badge-gray';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  goldCount = computed(() => this.customers().filter(c => c.membership === 'gold').length);
  newThisMonth = computed(() => this.customers().filter(c => c.joinedDate.startsWith('2024-1')).length);
  avgLtv = computed(() => {
    const total = this.customers().reduce((sum, c) => sum + c.totalSpend, 0);
    return '$' + (total / this.customers().length).toFixed(0);
  });
}
