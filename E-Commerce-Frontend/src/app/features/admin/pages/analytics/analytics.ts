import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../../../shared/stat-card/stat-card';
import { MockDataService } from '../../../../core/services/mock-data.service';

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
        <app-stat-card icon="💰" title="Total GMV" value="$2.4M" change="+22%" subtitle="this year" accentColor="purple"/>
        <app-stat-card icon="📦" title="Total Orders" value="48,920" change="+15%" subtitle="this year" accentColor="blue"/>
        <app-stat-card icon="👥" title="Total Users" value="124,381" change="+31%" subtitle="this year" accentColor="green"/>
        <app-stat-card icon="🏪" title="Active Stores" value="148" change="+18" subtitle="this month" accentColor="orange"/>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Monthly Revenue Trend</div>
          </div>
          <div style="height:280px;position:relative">
            <canvas #lineChart></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Category Breakdown</div>
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

  private mockData = inject(MockDataService);

  ngOnInit(): void {
    this.initLineChart();
    this.initDonutChart();
  }

  private initLineChart(): void {
    const data = this.mockData.getAnalyticsData();
    new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Revenue',
          data: data.revenue,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#7c3aed',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 }, callback: v => '$' + Number(v)/1000 + 'K' }, grid: { color: 'rgba(48,54,61,0.5)' } },
        },
      },
    });
  }

  private initDonutChart(): void {
    const data = this.mockData.getCategoryBreakdown();
    new Chart(this.donutChartRef.nativeElement, {
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
