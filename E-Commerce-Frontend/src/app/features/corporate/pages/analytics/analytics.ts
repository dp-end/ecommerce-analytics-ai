import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { ApiService } from '../../../../core/services/api.service';
import { OrderDto, ProductDto, ReviewDto } from '../../../../core/models/api.models';

Chart.register(...registerables);

interface ProductStat {
  productId: number;
  name: string;
  emoji: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  rating: number;
}

@Component({
  selector: 'app-corporate-analytics',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class CorporateAnalyticsComponent implements OnInit {
  @ViewChild('salesChart', { static: true }) salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart', { static: true }) categoryChartRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private salesChart: Chart | null = null;
  private catChart: Chart | null = null;

  orders   = signal<OrderDto[]>([]);
  products = signal<ProductDto[]>([]);
  reviews  = signal<ReviewDto[]>([]);

  // ─── KPI Computeds ──────────────────────────────────────────────────────────
  totalRevenue  = computed(() => this.orders().reduce((s, o) => s + (o.grandTotal ?? 0), 0));
  totalOrders   = computed(() => this.orders().length);
  avgOrderValue = computed(() => this.totalOrders() > 0 ? this.totalRevenue() / this.totalOrders() : 0);

  thisMonthRevenue = computed(() => {
    const now = new Date();
    return this.orders()
      .filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, o) => s + (o.grandTotal ?? 0), 0);
  });

  uniqueCustomers = computed(() => new Set(this.orders().map(o => o.userId)).size);

  // ─── Product Stats ──────────────────────────────────────────────────────────
  productStats = computed((): ProductStat[] => {
    const productMap = new Map(this.products().map(p => [p.id, p]));

    const reviewsByProduct = new Map<number, number[]>();
    for (const r of this.reviews()) {
      if (!r.productId) continue;
      if (!reviewsByProduct.has(r.productId)) reviewsByProduct.set(r.productId, []);
      reviewsByProduct.get(r.productId)!.push(r.starRating);
    }

    const statMap = new Map<number, ProductStat>();
    for (const order of this.orders()) {
      for (const item of order.items) {
        const p = productMap.get(item.productId);
        if (!statMap.has(item.productId)) {
          statMap.set(item.productId, {
            productId: item.productId,
            name: item.productName,
            emoji: p?.emoji ?? '📦',
            categoryName: p?.categoryName ?? '—',
            unitsSold: 0,
            revenue: 0,
            rating: 0,
          });
        }
        const stat = statMap.get(item.productId)!;
        stat.unitsSold += item.quantity;
        stat.revenue   += item.price * item.quantity;
      }
    }

    for (const [id, stat] of statMap) {
      const ratings = reviewsByProduct.get(id) ?? [];
      stat.rating = ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 0;
    }

    return Array.from(statMap.values()).sort((a, b) => b.revenue - a.revenue);
  });

  topProducts = computed(() => this.productStats().slice(0, 8));

  ngOnInit(): void {
    this.buildSalesChart([]);

    this.api.getMyStores().subscribe({
      next: stores => {
        if (!stores.length) return;
        const storeId = stores[0].id;

        this.api.getOrdersByStore(storeId).subscribe({
          next: orders => {
            this.orders.set(orders);
            this.buildSalesChart(orders);
            this.buildCategoryChart();
          },
        });

        this.api.getReviewsByStore(storeId).subscribe({
          next: reviews => this.reviews.set(reviews),
        });
      },
    });

    this.api.getMyProducts().subscribe({
      next: products => {
        this.products.set(products);
        this.buildCategoryChart();
      },
    });
  }

  private buildSalesChart(orders: OrderDto[]): void {
    const months: string[] = [];
    const revenueData: number[] = [];
    const orderData: number[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }));

      const monthOrders = orders.filter(o => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
      });
      revenueData.push(monthOrders.reduce((s, o) => s + (o.grandTotal ?? 0), 0));
      orderData.push(monthOrders.length);
    }

    if (this.salesChart) this.salesChart.destroy();
    this.salesChart = new Chart(this.salesChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Gelir ($)',
            data: revenueData,
            borderColor: '#0F766E',
            backgroundColor: 'rgba(15,118,110,0.08)',
            fill: true, tension: 0.4,
            pointBackgroundColor: '#0F766E', pointRadius: 4,
            yAxisID: 'y',
          },
          {
            label: 'Sipariş Sayısı',
            data: orderData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.04)',
            fill: false, tension: 0.4,
            pointBackgroundColor: '#2563eb', pointRadius: 4,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#64748B', font: { size: 11 }, usePointStyle: true } },
          tooltip: { backgroundColor: '#FFFFFF', borderColor: '#D9E2EC', borderWidth: 1, titleColor: '#172033', bodyColor: '#475569' },
        },
        scales: {
          x: { ticks: { color: '#64748B', font: { size: 11 } }, grid: { color: 'rgba(217,226,236,0.8)' } },
          y: {
            position: 'left',
            ticks: { color: '#64748B', font: { size: 11 }, callback: v => '$' + Number(v).toLocaleString() },
            grid: { color: 'rgba(217,226,236,0.8)' },
          },
          y1: {
            position: 'right',
            ticks: { color: '#64748B', font: { size: 11 } },
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
  }

  private buildCategoryChart(): void {
    const catMap = new Map<string, number>();
    for (const stat of this.productStats()) {
      const cat = stat.categoryName || 'Diğer';
      catMap.set(cat, (catMap.get(cat) ?? 0) + stat.revenue);
    }

    const labels = Array.from(catMap.keys());
    const data   = Array.from(catMap.values());

    if (this.catChart) this.catChart.destroy();
    this.catChart = new Chart(this.categoryChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#0F766E','#2563eb','#10b981','#0891b2','#d97706','#ea580c','#dc2626','#64748B'],
          borderColor: '#FFFFFF',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#64748B', font: { size: 11 }, padding: 12, usePointStyle: true } },
          tooltip: {
            backgroundColor: '#FFFFFF', borderColor: '#D9E2EC', borderWidth: 1,
            titleColor: '#172033', bodyColor: '#475569',
            callbacks: { label: ctx => ` $${(ctx.parsed ?? 0).toFixed(2)}` },
          },
        },
        cutout: '65%',
      },
    });
  }

  formatRevenue(v: number): string {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'K';
    return '$' + v.toFixed(2);
  }
}
