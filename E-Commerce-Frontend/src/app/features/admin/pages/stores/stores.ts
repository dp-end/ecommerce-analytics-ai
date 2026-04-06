import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { StoreDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stores.html',
  styleUrl: './stores.css',
})
export class AdminStoresComponent implements OnInit {
  private api = inject(ApiService);

  stores = signal<StoreDto[]>([]);
  searchQuery = signal('');
  statusFilter = signal('all');
  loading = signal(false);

  filteredStores = computed(() => {
    let list = this.stores();
    if (this.statusFilter() !== 'all') {
      list = list.filter(s => s.status.toLowerCase() === this.statusFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getStores().subscribe({
      next: stores => { this.stores.set(stores); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleStatus(store: StoreDto): void {
    const newStatus = store.status.toUpperCase() === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.api.updateStoreStatus(store.id, newStatus).subscribe({
      next: updated => this.stores.update(stores => stores.map(s => s.id === updated.id ? updated : s)),
    });
  }

  deleteStore(id: number): void {
    this.api.deleteStore(id).subscribe({
      next: () => this.stores.update(stores => stores.filter(s => s.id !== id)),
    });
  }

  formatRevenue(v: number): string {
    return '$' + (v / 1000).toFixed(0) + 'K';
  }

  getCategoryEmoji(cat?: string): string {
    if (!cat) return '🏪';
    const map: Record<string, string> = {
      Electronics: '💻', Fashion: '👗', 'Food & Kitchen': '🍳', Sports: '⚽',
      'Home & Garden': '🌿', Books: '📚', 'Pet Supplies': '🐾', Beauty: '✨',
    };
    return map[cat] || '🏪';
  }

  getStatusBadge(status: string): string {
    return status.toUpperCase() === 'OPEN' ? 'badge-green' : 'badge-gray';
  }
}
