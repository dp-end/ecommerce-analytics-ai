import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { MockDataService } from '../../../../core/services/mock-data.service';

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

  private mockData = inject(MockDataService);

  recentOrders = signal(this.mockData.getOrders().slice(0, 6));

  ngOnInit(): void {
    this.initChart();
  }

  private initChart(): void {
    const weeklyData = this.mockData.getWeeklyRevenue();
    new Chart(this.revenueChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: weeklyData.labels,
        datasets: [{
          label: 'Revenue',
          data: weeklyData.data,
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
            backgroundColor: '#161b22',
            borderColor: '#30363d',
            borderWidth: 1,
            titleColor: '#e6edf3',
            bodyColor: '#8b949e',
            callbacks: { label: ctx => ` $${(ctx.parsed.y ?? 0).toLocaleString()}` },
          },
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 }, callback: v => '$' + Number(v)/1000 + 'K' }, grid: { color: 'rgba(48,54,61,0.5)' } },
        },
      },
    });
  }

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
}
