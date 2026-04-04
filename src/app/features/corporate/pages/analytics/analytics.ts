import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { MockDataService } from '../../../../core/services/mock-data.service';

Chart.register(...registerables);

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

  private mockData = inject(MockDataService);

  ngOnInit(): void {
    this.initSalesChart();
    this.initCategoryChart();
  }

  private initSalesChart(): void {
    const data = this.mockData.getAnalyticsData();
    new Chart(this.salesChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Revenue',
            data: data.revenue,
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.08)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#7c3aed',
            pointRadius: 4,
          },
          {
            label: 'Orders × 100',
            data: data.orders.map(v => v * 100),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.04)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#2563eb',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b949e', font: { size: 11 }, usePointStyle: true } },
          tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 }, callback: v => '$' + Number(v)/1000 + 'K' }, grid: { color: 'rgba(48,54,61,0.5)' } },
        },
      },
    });
  }

  private initCategoryChart(): void {
    const data = this.mockData.getCategoryBreakdown();
    new Chart(this.categoryChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: ['#7c3aed','#2563eb','#10b981','#06b6d4','#f59e0b','#f97316'],
          borderColor: '#161b22',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 11 }, padding: 12, usePointStyle: true } },
          tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
        },
        cutout: '65%',
      },
    });
  }
}
