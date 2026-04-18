import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { CartService } from '../../../../core/services/cart.service';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductDto, ReviewDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  cartService = inject(CartService);
  favoritesService = inject(FavoritesService);
  authService = inject(AuthService);

  product = signal<ProductDto | null>(null);
  reviews = signal<ReviewDto[]>([]);
  loading = signal(true);
  error = signal('');

  // Comment form state
  newRating = signal(5);
  newText = signal('');
  newHeadline = signal('');
  submitting = signal(false);
  submitError = signal('');
  submitSuccess = signal(false);

  // Comment action state (track which item is in-flight)
  deletingId = signal<number | null>(null);
  likingId = signal<number | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error.set('Geçersiz ürün ID.'); this.loading.set(false); return; }

    this.api.getProductById(id).subscribe({
      next: p => {
        this.product.set(p);
        this.loading.set(false);
        this.loadReviews(id);
      },
      error: () => {
        this.error.set('Ürün bulunamadı.');
        this.loading.set(false);
      },
    });
  }

  private loadReviews(productId: number): void {
    this.api.getReviewsByProduct(productId).subscribe({
      next: r => this.reviews.set(r),
      error: () => {},
    });
  }

  isStoreOwner(): boolean {
    const p = this.product();
    const u = this.authService.currentUser();
    return !!(p?.storeOwnerId && u && p.storeOwnerId === u.id);
  }

  canDeleteReview(): boolean {
    return this.isStoreOwner() || this.authService.currentUser()?.role === 'admin';
  }

  submitComment(): void {
    const p = this.product();
    if (!p) return;

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const text = this.newText().trim();
    if (!text) { this.submitError.set('Yorum metni boş olamaz.'); return; }
    if (text.length > 2000) { this.submitError.set('Yorum en fazla 2000 karakter olabilir.'); return; }

    this.submitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set(false);

    this.api.createReview({
      productId: p.id,
      starRating: this.newRating(),
      reviewText: text,
      reviewHeadline: this.newHeadline().trim() || undefined,
    }).subscribe({
      next: r => {
        this.reviews.update(list => [r, ...list]);
        this.newText.set('');
        this.newHeadline.set('');
        this.newRating.set(5);
        this.submitting.set(false);
        this.submitSuccess.set(true);
        setTimeout(() => this.submitSuccess.set(false), 3000);
      },
      error: (err) => {
        this.submitError.set(err?.error?.message ?? 'Yorum gönderilemedi.');
        this.submitting.set(false);
      },
    });
  }

  deleteReview(reviewId: number): void {
    this.deletingId.set(reviewId);
    this.api.deleteReview(reviewId).subscribe({
      next: () => {
        this.reviews.update(list => list.filter(r => r.id !== reviewId));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  likeReview(reviewId: number): void {
    this.likingId.set(reviewId);
    this.api.likeReview(reviewId).subscribe({
      next: updated => {
        this.reviews.update(list => list.map(r => r.id === reviewId ? updated : r));
        this.likingId.set(null);
      },
      error: () => this.likingId.set(null),
    });
  }

  addToCart(): void {
    const p = this.product();
    if (p) this.cartService.addItem(p);
  }

  toggleFavorite(): void {
    const p = this.product();
    if (!p) return;
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.favoritesService.toggle(p.id);
  }

  isFavorite(): boolean {
    const p = this.product();
    return p ? this.favoritesService.isFavorite(p.id) : false;
  }

  isInCart(): boolean {
    const p = this.product();
    return p ? this.cartService.items().some(i => i.product.id === p.id) : false;
  }

  setRating(r: number): void {
    this.newRating.set(r);
  }

  getStars(rating: number): string {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  stockLabel(): string {
    const s = this.product()?.stock ?? 0;
    if (s > 20) return 'Stokta Var';
    if (s > 0) return `Az Stok (${s})`;
    return 'Stokta Yok';
  }

  stockBadge(): string {
    const s = this.product()?.stock ?? 0;
    if (s > 20) return 'badge-green';
    if (s > 0) return 'badge-yellow';
    return 'badge-red';
  }

  avgRating(): number {
    const r = this.reviews();
    if (!r.length) return this.product()?.rating ?? 0;
    return r.reduce((s, rv) => s + rv.starRating, 0) / r.length;
  }
}
