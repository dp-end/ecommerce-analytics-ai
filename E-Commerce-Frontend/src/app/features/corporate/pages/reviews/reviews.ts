import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../../../core/services/api.service';
import { ReviewDto } from '../../../../core/models/api.models';

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

  private api = inject(ApiService);
  reviews = signal<ReviewDto[]>([]);
  avgRating = signal(0);
  ratingBars = signal<{ star: number; count: number; pct: number }[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getReviews().subscribe({
      next: reviews => {
        this.reviews.set(reviews);
        this.loading.set(false);
        if (reviews.length > 0) {
          const total = reviews.reduce((sum, r) => sum + r.starRating, 0);
          this.avgRating.set(Math.round((total / reviews.length) * 10) / 10);
          this.computeRatingBars(reviews);
          this.initChart(reviews);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private initChart(reviews: ReviewDto[]): void {
    const distribution = [1, 2, 3, 4, 5].map(star =>
      reviews.filter(r => r.starRating === star).length
    );
    new Chart(this.ratingChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
        datasets: [{
          label: 'Reviews',
          data: distribution,
          backgroundColor: ['rgba(239,68,68,0.7)', 'rgba(249,115,22,0.7)', 'rgba(245,158,11,0.7)', 'rgba(37,99,235,0.7)', 'rgba(16,185,129,0.7)'],
          borderColor: ['#ef4444', '#f97316', '#f59e0b', '#2563eb', '#10b981'],
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
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

  private computeRatingBars(reviews: ReviewDto[]): void {
    const total = reviews.length;
    const bars = [5, 4, 3, 2, 1].map(star => {
      const count = reviews.filter(r => r.starRating === star).length;
      return { star, count, pct: total > 0 ? Math.round(count / total * 100) : 0 };
    });
    this.ratingBars.set(bars);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }
}
