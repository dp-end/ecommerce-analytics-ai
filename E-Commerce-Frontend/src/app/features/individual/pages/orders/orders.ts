import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { OrderDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-individual-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class IndividualOrdersComponent implements OnInit {
  private api = inject(ApiService);

  orders = signal<OrderDto[]>([]);
  statusFilter = signal('all');
  loading = signal(false);

  filteredOrders = computed(() => {
    const list = this.orders();
    if (this.statusFilter() === 'all') return list;
    return list.filter(o => o.status.toLowerCase() === this.statusFilter());
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getMyOrders().subscribe({
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

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      pending: '⏳', processing: '⚙️', shipped: '🚚', completed: '✅', cancelled: '❌',
    };
    return map[status.toLowerCase()] || '📦';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }

  statusOptions = ['all', 'pending', 'processing', 'shipped', 'completed', 'cancelled'];
}
