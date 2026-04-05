import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockOrder } from '../../../../core/services/mock-data.service';

@Component({
  selector: 'app-corporate-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class CorporateOrdersComponent {
  private mockData = inject(MockDataService);

  orders = signal<MockOrder[]>(this.mockData.getOrders());
  statusFilter = signal('all');
  searchQuery = signal('');

  filteredOrders = computed(() => {
    let list = this.orders();
    if (this.statusFilter() !== 'all') {
      list = list.filter(o => o.status === this.statusFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(o => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
    }
    return list;
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

  fulfilOrder(order: MockOrder): void {
    this.orders.update(orders =>
      orders.map(o => o.id === order.id ? { ...o, status: 'shipped' as MockOrder['status'] } : o)
    );
  }

  statusOptions = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
}
