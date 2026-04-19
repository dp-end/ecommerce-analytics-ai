import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { ReviewDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class AdminReviewsComponent implements OnInit {
  private api = inject(ApiService);

  reviews = signal<ReviewDto[]>([]);
  loading = signal(false);
  error = signal('');
  searchQuery = signal('');
  ratingFilter = signal('all');

  filteredReviews = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const rating = this.ratingFilter();

    return this.reviews().filter(review => {
      const matchesRating = rating === 'all' || review.starRating === Number(rating);
      const text = [
        review.customerName,
        review.productName,
        review.reviewHeadline,
        review.reviewText,
        review.reviewType,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesRating && (!query || text.includes(query));
    });
  });

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getReviewsPaged(0, 100).subscribe({
      next: page => {
        this.reviews.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Reviews could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  getStars(rating: number): string {
    const value = Number(rating) || 0;
    return '★'.repeat(value) + '☆'.repeat(Math.max(0, 5 - value));
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'No date';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  }

  subject(review: ReviewDto): string {
    if (review.productName) return review.productName;
    return review.reviewType === 'STORE' ? 'Store review' : 'Product review';
  }

  reviewer(review: ReviewDto): string {
    return review.customerName || 'Customer';
  }
}
