import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { ApiService } from '../../../../core/services/api.service';
import { DashboardStats } from '../../../../core/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div class="page fade-in">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem">
        <div>
          <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem">Platform Analytics</h2>
          <p style="color:var(--text-secondary);font-size:0.875rem">Comprehensive platform-wide performance metrics</p>
        </div>
        <button class="btn btn-primary btn-sm">📥 Export Report</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem">
        <app-stat-card icon="💰" title="Total Revenue" [value]="formatCurrency(stats()?.totalRevenue)" subtitle="all time" accentColor="purple"/>
        <app-stat-card icon="📦" title="Total Orders" [value]="(stats()?.totalOrders ?? 0).toLocaleString()" subtitle="all time" accentColor="blue"/>
        <app-stat-card icon="👥" title="Total Users" [value]="(stats()?.totalUsers ?? 0).toLocaleString()" subtitle="registered" accentColor="green"/>
        <app-stat-card icon="🏪" title="Total Stores" [value]="(stats()?.totalStores ?? 0).toLocaleString()" subtitle="active" accentColor="orange"/>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Revenue by Store</div>
          </div>
          <div style="height:280px;position:relative">
            <canvas #lineChart></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Orders by Status</div>
          </div>
          <div style="height:280px;position:relative">
            <canvas #donutChart></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`.page { display:flex;flex-direction:column;gap:1.5rem; }`],
})
export class AdminAnalyticsComponent implements OnInit {
  @ViewChild('lineChart', { static: true }) lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart', { static: true }) donutChartRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  stats = signal<DashboardStats | null>(null);

  ngOnInit(): void {
    this.api.getDashboardStats().subscribe({ next: s => this.stats.set(s) });
    this.api.getRevenueByStore().subscribe({ next: stores => this.initBarChart(stores.slice(0, 6)) });
    this.api.getDashboardStats().subscribe({ next: s => this.initDonutChart(s.ordersByStatus) });
  }

  private initBarChart(stores: { storeName: string; revenue: number }[]): void {
    new Chart(this.lineChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: stores.map(s => s.storeName),
        datasets: [{
          label: 'Revenue',
          data: stores.map(s => s.revenue),
          backgroundColor: ['rgba(124,58,237,0.7)','rgba(37,99,235,0.7)','rgba(16,185,129,0.7)','rgba(6,182,212,0.7)','rgba(245,158,11,0.7)','rgba(249,115,22,0.7)'],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e', callbacks: { label: ctx => ` $${(ctx.parsed.y ?? 0).toLocaleString()}` } } },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 }, callback: v => '$' + Number(v)/1000 + 'K' }, grid: { color: 'rgba(48,54,61,0.5)' } },
        },
      },
    });
  }

  private initDonutChart(byStatus: Record<string, number>): void {
    const labels = Object.keys(byStatus);
    const data = Object.values(byStatus);
    new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: ['#10b981','#06b6d4','#2563eb','#f59e0b','#ef4444'], borderColor: '#161b22', borderWidth: 3 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 11 }, padding: 12, usePointStyle: true } },
          tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
        },
        cutout: '65%',
      },
    });
  }

  formatCurrency(v?: number): string {
    if (v == null) return '$0';
    return v >= 1000000 ? '$' + (v / 1000000).toFixed(1) + 'M' : '$' + (v / 1000).toFixed(0) + 'K';
  }
}
