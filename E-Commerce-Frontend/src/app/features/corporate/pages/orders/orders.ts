import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { OrderDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-corporate-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class CorporateOrdersComponent implements OnInit {
  private api = inject(ApiService);

  orders = signal<OrderDto[]>([]);
  statusFilter = signal('all');
  searchQuery = signal('');
  loading = signal(false);

  filteredOrders = computed(() => {
    let list = this.orders();
    if (this.statusFilter() !== 'all') {
      list = list.filter(o => o.status.toLowerCase() === this.statusFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(o =>
        String(o.id).toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getOrders().subscribe({
      next: orders => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-yellow', processing: 'badge-blue',
      shipped: 'badge-cyan', completed: 'badge-green', cancelled: 'badge-red',
    };
    return map[status.toLowerCase()] || 'badge-gray';
  }

  fulfilOrder(order: OrderDto): void {
    this.api.updateOrderStatus(order.id, 'SHIPPED').subscribe({
      next: updated => this.orders.update(orders => orders.map(o => o.id === updated.id ? updated : o)),
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }

  statusOptions = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
}
