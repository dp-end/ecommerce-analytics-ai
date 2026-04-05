import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { MockDataService } from '../../../../core/services/mock-data.service';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('revenueChart', { static: true }) revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private mockData = inject(MockDataService);

  activityLog = signal(this.mockData.getActivityLog());
  topStores = signal(this.mockData.getStores().slice(0, 5));

  private chart: Chart | null = null;

  ngOnInit(): void {
    this.initChart();
  }

  private initChart(): void {
    const storeRevenue = this.mockData.getStoreRevenue();

    this.chart = new Chart(this.revenueChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: storeRevenue.labels,
        datasets: [{
          label: 'Revenue ($)',
          data: storeRevenue.data,
          backgroundColor: [
            'rgba(124, 58, 237, 0.7)',
            'rgba(37, 99, 235, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(249, 115, 22, 0.7)',
          ],
          borderColor: [
            '#7c3aed',
            '#2563eb',
            '#10b981',
            '#06b6d4',
            '#f59e0b',
            '#f97316',
          ],
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
            backgroundColor: '#161b22',
            borderColor: '#30363d',
            borderWidth: 1,
            titleColor: '#e6edf3',
            bodyColor: '#8b949e',
            callbacks: {
              label: (ctx) => ` $${(ctx.parsed.y ?? 0).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#8b949e', font: { size: 11 } },
            grid: { color: 'rgba(48, 54, 61, 0.5)' },
          },
          y: {
            ticks: {
              color: '#8b949e',
              font: { size: 11 },
              callback: (v) => `$${Number(v) / 1000}K`,
            },
            grid: { color: 'rgba(48, 54, 61, 0.5)' },
          },
        },
      },
    });
  }

  getActivityClass(type: string): string {
    const map: Record<string, string> = {
      success: 'badge-green',
      warning: 'badge-yellow',
      error: 'badge-red',
      info: 'badge-blue',
    };
    return map[type] || 'badge-gray';
  }

  formatRevenue(v: number): string {
    return '$' + (v / 1000).toFixed(0) + 'K';
  }
}
