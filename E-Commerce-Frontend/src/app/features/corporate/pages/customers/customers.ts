import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { CustomerProfileDto } from '../../../../core/models/api.models';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';

@Component({
  selector: 'app-corporate-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
})
export class CorporateCustomersComponent implements OnInit {
  private api = inject(ApiService);

  customers = signal<CustomerProfileDto[]>([]);
  searchQuery = signal('');
  membershipFilter = signal('all');
  loading = signal(false);

  filteredCustomers = computed(() => {
    let list = this.customers();
    if (this.membershipFilter() !== 'all') {
      list = list.filter(c => c.membershipType.toLowerCase() === this.membershipFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(c => c.userName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getUsers().subscribe({
      next: users => {
        // Load profiles for each user
        const profileRequests = users.map(u => u.id);
        this.loadProfiles(profileRequests);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadProfiles(userIds: number[]): void {
    if (userIds.length === 0) { this.loading.set(false); return; }
    // Load first user's profile as example; in production you'd use a bulk endpoint
    // For now, we get customer analytics
    this.api.getCustomerAnalytics().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
    // Load profiles one by one up to 20
    const toLoad = userIds.slice(0, 20);
    let loaded = 0;
    toLoad.forEach(userId => {
      this.api.getUserProfile(userId).subscribe({
        next: profile => {
          this.customers.update(c => [...c, profile]);
          loaded++;
          if (loaded === toLoad.length) this.loading.set(false);
        },
        error: () => {
          loaded++;
          if (loaded === toLoad.length) this.loading.set(false);
        },
      });
    });
  }

  getMembershipBadge(membership: string): string {
    const map: Record<string, string> = {
      GOLD: 'badge-yellow', SILVER: 'badge-gray', BRONZE: 'badge-orange',
    };
    return map[membership?.toUpperCase()] || 'badge-gray';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  newThisMonth = computed(() => this.customers().filter(c => c.membershipType?.toUpperCase() === 'BRONZE').length);
  goldCount = computed(() => this.customers().filter(c => c.membershipType?.toUpperCase() === 'GOLD').length);
  avgLtv = computed(() => {
    const list = this.customers();
    if (!list.length) return '$0';
    const total = list.reduce((sum, c) => sum + (c.totalSpend ?? 0), 0);
    return '$' + (total / list.length).toFixed(0);
  });
}
