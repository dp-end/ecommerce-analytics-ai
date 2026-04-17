import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { ApiService } from '../../../../core/services/api.service';
import { AuditLogDto, DashboardStats, StoreRevenueItem } from '../../../../core/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('revenueChart', { static: true }) revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);

  activityLog = signal<AuditLogDto[]>([]);
  allActivityLog: AuditLogDto[] = [];
  topStores = signal<StoreRevenueItem[]>([]);
  stats = signal<DashboardStats | null>(null);
  isLast30Days = signal(false);

  private chart: Chart | null = null;

  ngOnInit(): void {
    this.api.getAuditLogs().subscribe({
      next: logs => {
        this.allActivityLog = logs;
        this.activityLog.set(logs.slice(0, 8));
      },
    });
    this.api.getDashboardStats().subscribe({ next: s => this.stats.set(s) });
    this.api.getRevenueByStore().subscribe({
      next: stores => {
        const top = [...stores].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
        this.topStores.set(top);
        this.initChart(top);
      },
    });
  }

  toggleLast30Days(): void {
    this.isLast30Days.update(v => !v);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const filtered = this.isLast30Days()
      ? this.allActivityLog.filter(l => new Date(l.createdAt) >= cutoff)
      : this.allActivityLog;
    this.activityLog.set(filtered.slice(0, 8));
  }

  private initChart(stores: StoreRevenueItem[]): void {
    if (this.chart) this.chart.destroy();
    const colors = [
      'rgba(124,58,237,0.7)', 'rgba(37,99,235,0.7)', 'rgba(16,185,129,0.7)',
      'rgba(6,182,212,0.7)', 'rgba(245,158,11,0.7)', 'rgba(249,115,22,0.7)',
    ];
    const borders = ['#7c3aed', '#2563eb', '#10b981', '#06b6d4', '#f59e0b', '#f97316'];

    this.chart = new Chart(this.revenueChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: stores.map(s => s.storeName),
        datasets: [{
          label: 'Revenue ($)',
          data: stores.map(s => s.revenue),
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 6,
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
            callbacks: { label: ctx => ` $${(ctx.parsed.y ?? 0).toLocaleString()}` },
          },
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: {
            ticks: { color: '#8b949e', font: { size: 11 }, callback: v => `$${Number(v) / 1000}K` },
            grid: { color: 'rgba(48,54,61,0.5)' },
          },
        },
      },
    });
  }

  getActivityClass(type: string): string {
    const map: Record<string, string> = { SUCCESS: 'badge-green', WARNING: 'badge-yellow', ERROR: 'badge-red', INFO: 'badge-blue' };
    return map[type?.toUpperCase()] || 'badge-gray';
  }

  formatRevenue(v: number): string {
    return '$' + (v / 1000).toFixed(0) + 'K';
  }

  formatTotalRevenue(v: number): string {
    if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'K';
    return '$' + v.toFixed(2);
  }

  exportReport(): void {
    const s = this.stats();
    const stores = this.topStores();
    const rows: string[][] = [
      ['Dashboard Report', new Date().toLocaleDateString('tr-TR')],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', '$' + (s?.totalRevenue ?? 0).toLocaleString()],
      ['Total Orders', String(s?.totalOrders ?? 0)],
      ['Total Users', String(s?.totalUsers ?? 0)],
      ['Total Stores', String(s?.totalStores ?? 0)],
      [],
      ['Store', 'Revenue', 'Orders', 'Rating'],
      ...stores.map(r => [r.storeName, '$' + r.revenue.toFixed(2), String(r.orderCount), String(r.rating)]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
