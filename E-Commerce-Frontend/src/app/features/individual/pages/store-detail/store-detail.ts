import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
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
export class StoreDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  readonly PRODUCT_RENDER_LIMIT = 40;
  authService = inject(AuthService);
  cartService = inject(CartService);

  private intersectionObserver!: IntersectionObserver;
  private productScrollSentinelRef?: ElementRef<HTMLDivElement>;

  @ViewChild('productScrollSentinel')
  set productScrollSentinel(ref: ElementRef<HTMLDivElement> | undefined) {
    this.productScrollSentinelRef = ref;
    this.observeProductSentinel();
  }

  store = signal<StoreDto | null>(null);
  products = signal<ProductDto[]>([]);
  reviews = signal<ReviewDto[]>([]);
  loading = signal(true);
  storeError = signal('');
  activeTab = signal<ActiveTab>('products');

  reviewSubmitting = signal(false);
  reviewSuccess = signal(false);
  reviewError = signal('');
  reviewsLoading = signal(false);
  reviewsError = signal('');
  hoveredStar = signal(0);
  productsLoading = signal(false);
  productsLoadingMore = signal(false);
  productsError = signal('');
  productPage = signal(0);
  productTotalPages = signal(0);
  productTotalElements = signal(0);

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

  visibleProducts = computed(() =>
    this.products()
  );

  hasMoreProducts = computed(() =>
    this.productPage() + 1 < this.productTotalPages()
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.storeError.set('Geçersiz mağaza ID.');
      this.loading.set(false);
      return;
    }

    this.api.getStoreById(id).subscribe({
      next: s => {
        this.store.set(s);
        this.loading.set(false);
      },
      error: err => {
        this.storeError.set(err?.status === 404 ? 'Mağaza bulunamadı.' : 'Mağaza bilgileri yüklenemedi.');
        this.loading.set(false);
      },
    });

    this.loadProducts(id, true);

    this.reviewsLoading.set(true);
    this.reviewsError.set('');
    this.api.getReviewsByStore(id).subscribe({
      next: r => {
        this.reviews.set(r);
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.reviewsError.set('Yorumlar yüklenemedi.');
        this.reviewsLoading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        const id = this.store()?.id;
        if (entries[0].isIntersecting && id && this.hasMoreProducts() && !this.productsLoadingMore()) {
          this.loadProducts(id, false);
        }
      },
      { threshold: 0.1 }
    );
    this.observeProductSentinel();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadProducts(storeId: number, reset = false): void {
    if (this.productsLoading() || this.productsLoadingMore()) return;
    const page = reset ? 0 : this.productPage() + 1;

    if (reset) {
      this.products.set([]);
      this.productPage.set(0);
      this.productTotalPages.set(0);
      this.productTotalElements.set(0);
      this.productsError.set('');
      this.productsLoading.set(true);
    } else {
      this.productsLoadingMore.set(true);
    }

    this.api.getProductsPaged({
      storeId,
      page,
      size: this.PRODUCT_RENDER_LIMIT,
    }).subscribe({
      next: res => {
        this.products.update(list => reset ? res.content : [...list, ...res.content]);
        this.productPage.set(res.currentPage);
        this.productTotalPages.set(res.totalPages);
        this.productTotalElements.set(res.totalElements);
        this.productsLoading.set(false);
        this.productsLoadingMore.set(false);
      },
      error: () => {
        this.productsError.set('Ürünler yüklenemedi.');
        this.productsLoading.set(false);
        this.productsLoadingMore.set(false);
      },
    });
  }

  private observeProductSentinel(): void {
    if (!this.intersectionObserver || !this.productScrollSentinelRef?.nativeElement) return;
    this.intersectionObserver.disconnect();
    this.intersectionObserver.observe(this.productScrollSentinelRef.nativeElement);
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
    rating = Number(rating) || 0;
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
    this.router.navigate([this.roleBasePath(), 'product', id]);
  }

  backPath(): string {
    const role = this.authService.currentUser()?.role;
    if (role === 'admin') return '/admin/stores';
    if (role === 'corporate') return '/corporate/dashboard';
    return '/individual/home';
  }

  private roleBasePath(): string {
    const role = this.authService.currentUser()?.role;
    if (role === 'admin') return '/admin';
    if (role === 'corporate') return '/corporate';
    return '/individual';
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
