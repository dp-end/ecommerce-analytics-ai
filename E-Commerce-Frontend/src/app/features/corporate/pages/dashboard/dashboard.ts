import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { ApiService } from '../../../../core/services/api.service';
import { OrderDto, ProductDto, ReviewDto, StoreDto } from '../../../../core/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-corporate-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class CorporateDashboardComponent implements OnInit {
  @ViewChild('revenueChart', { static: true }) revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private chart: Chart | null = null;

  myStore  = signal<StoreDto | null>(null);
  orders   = signal<OrderDto[]>([]);
  products = signal<ProductDto[]>([]);
  reviews  = signal<ReviewDto[]>([]);

  recentOrders    = computed(() => [...this.orders()].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 6));

  totalRevenue    = computed(() => this.orders().reduce((s, o) => s + (o.grandTotal ?? 0), 0));
  totalOrders     = computed(() => this.orders().length);
  uniqueCustomers = computed(() => new Set(this.orders().map(o => o.userId)).size);
  avgRating       = computed(() => {
    const rs = this.reviews();
    if (!rs.length) return 0;
    return rs.reduce((s, r) => s + r.starRating, 0) / rs.length;
  });
  pendingCount   = computed(() => this.orders().filter(o => o.status.toUpperCase() === 'PENDING').length);
  shippedCount   = computed(() => this.orders().filter(o => o.status.toUpperCase() === 'SHIPPED').length);
  completedCount = computed(() => this.orders().filter(o => o.status.toUpperCase() === 'COMPLETED').length);
  productCount   = computed(() => this.products().length);

  ngOnInit(): void {
    this.buildChart([]);   // draw empty chart immediately (canvas is ready)

    this.api.getMyStores().subscribe({
      next: stores => {
        if (!stores.length) return;
        const store = stores[0];
        this.myStore.set(store);

        this.api.getOrdersByStore(store.id).subscribe({
          next: orders => {
            this.orders.set(orders);
            this.buildChart(orders);
          },
        });

        this.api.getReviewsByStore(store.id).subscribe({
          next: reviews => this.reviews.set(reviews),
        });
      },
    });

    this.api.getMyProducts().subscribe({
      next: products => this.products.set(products),
    });
  }

  private buildChart(orders: OrderDto[]): void {
    // Last 7 days — group order revenue by calendar day
    const days: string[] = [];
    const revenue: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('tr-TR', { weekday: 'short' }));

      const dayRev = orders
        .filter(o => {
          const od = new Date(o.createdAt);
          return od.getFullYear() === d.getFullYear()
            && od.getMonth() === d.getMonth()
            && od.getDate() === d.getDate();
        })
        .reduce((s, o) => s + (o.grandTotal ?? 0), 0);

      revenue.push(dayRev);
    }

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(this.revenueChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Gelir',
          data: revenue,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.08)',
          fill: true,
          tension: 0.45,
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: '#161b22',
          pointBorderWidth: 2,
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1,
            titleColor: '#e6edf3', bodyColor: '#8b949e',
            callbacks: { label: ctx => ` $${(ctx.parsed.y ?? 0).toFixed(2)}` },
          },
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#8b949e', font: { size: 11 },
              callback: v => '$' + Number(v).toLocaleString(),
            },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
        },
      },
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-yellow', processing: 'badge-blue',
      shipped: 'badge-cyan', completed: 'badge-green', cancelled: 'badge-red',
    };
    return map[status.toLowerCase()] || 'badge-gray';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Beklemede', processing: 'İşleniyor',
      shipped: 'Kargoda', completed: 'Teslim', cancelled: 'İptal',
    };
    return map[status.toLowerCase()] || status;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }

  formatRevenue(v: number): string {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'K';
    return '$' + v.toFixed(2);
  }
}
