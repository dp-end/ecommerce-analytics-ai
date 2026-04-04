import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockStore } from '../../../../core/services/mock-data.service';

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stores.html',
  styleUrl: './stores.css',
})
export class AdminStoresComponent {
  private mockData = inject(MockDataService);

  stores = signal<MockStore[]>(this.mockData.getStores());
  searchQuery = signal('');
  statusFilter = signal('all');

  filteredStores = computed(() => {
    let list = this.stores();
    if (this.statusFilter() !== 'all') {
      list = list.filter(s => s.status === this.statusFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q));
    }
    return list;
  });

  toggleStatus(store: MockStore): void {
    this.stores.update(stores =>
      stores.map(s => s.id === store.id
        ? { ...s, status: s.status === 'open' ? 'closed' : 'open' as 'open' | 'closed' }
        : s
      )
    );
  }

  formatRevenue(v: number): string {
    return '$' + (v / 1000).toFixed(0) + 'K';
  }

  getCategoryEmoji(cat: string): string {
    const map: Record<string, string> = {
      'Electronics': '💻',
      'Fashion': '👗',
      'Food & Kitchen': '🍳',
      'Sports': '⚽',
      'Home & Garden': '🌿',
      'Books': '📚',
      'Pet Supplies': '🐾',
      'Beauty': '✨',
    };
    return map[cat] || '🏪';
  }
}
