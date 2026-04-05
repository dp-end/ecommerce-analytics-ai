import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockShipment } from '../../../../core/services/mock-data.service';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';

@Component({
  selector: 'app-corporate-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent],
  templateUrl: './shipments.html',
  styleUrl: './shipments.css',
})
export class CorporateShipmentsComponent {
  private mockData = inject(MockDataService);

  shipments = signal<MockShipment[]>(this.mockData.getShipments());
  statusFilter = signal('all');

  filteredShipments = computed(() => {
    const list = this.shipments();
    if (this.statusFilter() === 'all') return list;
    return list.filter(s => s.status === this.statusFilter());
  });

  pending = computed(() => this.shipments().filter(s => s.status === 'pending').length);
  inTransit = computed(() => this.shipments().filter(s => s.status === 'in-transit').length);
  delivered = computed(() => this.shipments().filter(s => s.status === 'delivered').length);
  returned = computed(() => this.shipments().filter(s => s.status === 'returned').length);

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-yellow',
      'in-transit': 'badge-blue',
      delivered: 'badge-green',
      returned: 'badge-red',
    };
    return map[status] || 'badge-gray';
  }

  getCarrierEmoji(carrier: string): string {
    const map: Record<string, string> = {
      FedEx: '🔴',
      UPS: '🟤',
      DHL: '🟡',
      USPS: '🔵',
    };
    return map[carrier] || '📦';
  }
}
