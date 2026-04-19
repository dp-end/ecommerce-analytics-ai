import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { StoreDto, ProductDto, ReviewDto } from '../../../../core/models/api.models';

type ActiveTab = 'products' | 'reviews';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './store-detail.html',
  styleUrl: './store-detail.css',
})
export class StoreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  cartService = inject(CartService);

  store = signal<StoreDto | null>(null);
  products = signal<ProductDto[]>([]);
  reviews = signal<ReviewDto[]>([]);
  loading = signal(true);
  activeTab = signal<ActiveTab>('products');

  reviewSubmitting = signal(false);
  reviewSuccess = signal(false);
  reviewError = signal('');
  hoveredStar = signal(0);

  reviewForm: FormGroup = this.fb.group({
    starRating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    reviewHeadline: ['', [Validators.maxLength(200)]],
    reviewText: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  avgRating = computed(() => {
    const r = this.reviews();
    if (!r.length) return this.store()?.rating ?? 0;
    return r.reduce((s, rv) => s + rv.starRating, 0) / r.length;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/individual/home']); return; }

    this.api.getStoreById(id).subscribe({
      next: s => {
        this.store.set(s);
        this.loading.set(false);
      },
      error: () => this.router.navigate(['/individual/home']),
    });

    this.api.getProducts({ storeId: id }).subscribe({
      next: p => this.products.set(p),
    });

    this.api.getReviewsByStore(id).subscribe({
      next: r => this.reviews.set(r),
    });
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  setRating(value: number): void {
    this.reviewForm.patchValue({ starRating: value });
    this.hoveredStar.set(0);
  }

  getDisplayRating(): number {
    return this.hoveredStar() || (this.reviewForm.value.starRating ?? 5);
  }

  getStars(rating: number): string {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  submitReview(): void {
    if (this.reviewForm.invalid || !this.store()) return;
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.reviewSubmitting.set(true);
    this.reviewError.set('');
    this.reviewSuccess.set(false);

    const { starRating, reviewText, reviewHeadline } = this.reviewForm.value;

    this.api.createStoreReview({
      storeId: this.store()!.id,
      starRating,
      reviewText,
      reviewHeadline: reviewHeadline?.trim() || undefined,
    }).subscribe({
      next: r => {
        this.reviews.update(list => [r, ...list]);
        this.reviewForm.reset({ starRating: 5, reviewHeadline: '', reviewText: '' });
        this.reviewSubmitting.set(false);
        this.reviewSuccess.set(true);
        setTimeout(() => this.reviewSuccess.set(false), 3000);
      },
      error: err => {
        this.reviewError.set(err?.error?.message ?? 'Yorum gönderilemedi. Lütfen tekrar deneyin.');
        this.reviewSubmitting.set(false);
      },
    });
  }

  addToCart(product: ProductDto, event: Event): void {
    event.stopPropagation();
    this.cartService.addItem(product);
  }

  navigateToProduct(id: number): void {
    this.router.navigate(['/individual/product', id]);
  }

  getSentimentClass(sentiment?: string): string {
    switch (sentiment) {
      case 'POSITIVE': return 'badge-green';
      case 'NEGATIVE': return 'badge-red';
      case 'NEUTRAL':  return 'badge-yellow';
      default: return 'badge-gray';
    }
  }
}
