import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockOrder } from '../../../../core/services/mock-data.service';

@Component({
  selector: 'app-individual-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class IndividualOrdersComponent {
  private mockData = inject(MockDataService);

  orders = signal<MockOrder[]>(this.mockData.getOrders());
  statusFilter = signal('all');

  filteredOrders = computed(() => {
    const list = this.orders();
    if (this.statusFilter() === 'all') return list;
    return list.filter(o => o.status === this.statusFilter());
  });

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-yellow',
      processing: 'badge-blue',
      shipped: 'badge-cyan',
      completed: 'badge-green',
      cancelled: 'badge-red',
    };
    return map[status] || 'badge-gray';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      pending: '⏳',
      processing: '⚙️',
      shipped: '🚚',
      completed: '✅',
      cancelled: '❌',
    };
    return map[status] || '📦';
  }

  statusOptions = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
}
