import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { ShipmentDto } from '../../../../core/models/api.models';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';

@Component({
  selector: 'app-corporate-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, StatCardComponent],
  templateUrl: './shipments.html',
  styleUrl: './shipments.css',
})
export class CorporateShipmentsComponent implements OnInit {
  private api = inject(ApiService);

  shipments = signal<ShipmentDto[]>([]);
  statusFilter = signal('all');
  loading = signal(false);

  filteredShipments = computed(() => {
    const list = this.shipments();
    if (this.statusFilter() === 'all') return list;
    return list.filter(s => s.status.toLowerCase().replace('_', '-') === this.statusFilter());
  });

  pending = computed(() => this.shipments().filter(s => s.status.toUpperCase() === 'PENDING').length);
  inTransit = computed(() => this.shipments().filter(s => s.status.toUpperCase() === 'IN_TRANSIT').length);
  delivered = computed(() => this.shipments().filter(s => s.status.toUpperCase() === 'DELIVERED').length);
  returned = computed(() => this.shipments().filter(s => s.status.toUpperCase() === 'RETURNED').length);

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getShipments().subscribe({
      next: shipments => { this.shipments.set(shipments); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  updateStatus(shipment: ShipmentDto, status: string): void {
    this.api.updateShipmentStatus(shipment.id, status).subscribe({
      next: updated => this.shipments.update(s => s.map(sh => sh.id === updated.id ? updated : sh)),
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-yellow', in_transit: 'badge-blue',
      delivered: 'badge-green', returned: 'badge-red',
    };
    return map[status.toLowerCase()] || 'badge-gray';
  }

  getCarrierEmoji(carrier?: string): string {
    if (!carrier) return '📦';
    const map: Record<string, string> = { FedEx: '🔴', UPS: '🟤', DHL: '🟡', USPS: '🔵' };
    return map[carrier] || '📦';
  }
}
