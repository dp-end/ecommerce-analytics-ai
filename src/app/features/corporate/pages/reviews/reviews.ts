import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { MockDataService, MockReview } from '../../../../core/services/mock-data.service';

Chart.register(...registerables);

@Component({
  selector: 'app-corporate-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class CorporateReviewsComponent implements OnInit {
  @ViewChild('ratingChart', { static: true }) ratingChartRef!: ElementRef<HTMLCanvasElement>;

  private mockData = inject(MockDataService);
  reviews = signal<MockReview[]>(this.mockData.getReviews());

  avgRating = signal(0);

  ngOnInit(): void {
    const total = this.reviews().reduce((sum, r) => sum + r.stars, 0);
    this.avgRating.set(Math.round((total / this.reviews().length) * 10) / 10);
    this.computeRatingBars();
    this.initChart();
  }

  private initChart(): void {
    const distribution = [1, 2, 3, 4, 5].map(star =>
      this.reviews().filter(r => r.stars === star).length
    );

    new Chart(this.ratingChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
        datasets: [{
          label: 'Reviews',
          data: distribution,
          backgroundColor: ['rgba(239,68,68,0.7)', 'rgba(249,115,22,0.7)', 'rgba(245,158,11,0.7)', 'rgba(37,99,235,0.7)', 'rgba(16,185,129,0.7)'],
          borderColor: ['#ef4444','#f97316','#f59e0b','#2563eb','#10b981'],
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' },
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
          y: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
        },
      },
    });
  }

  getStars(count: number): string {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  }

  ratingBars = signal<{ star: number; count: number; pct: number }[]>([]);

  private computeRatingBars(): void {
    const total = this.reviews().length;
    const bars = [5, 4, 3, 2, 1].map(star => {
      const count = this.reviews().filter(r => r.stars === star).length;
      return { star, count, pct: total > 0 ? Math.round(count / total * 100) : 0 };
    });
    this.ratingBars.set(bars);
  }
}
