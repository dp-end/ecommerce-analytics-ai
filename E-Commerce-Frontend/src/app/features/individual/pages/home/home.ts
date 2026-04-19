import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, inject, signal, computed, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { CartService } from '../../../../core/services/cart.service';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CategoryDto, ProductDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-individual-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class IndividualHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  cartService = inject(CartService);
  favoritesService = inject(FavoritesService);

  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef<HTMLDivElement>;
  private intersectionObserver!: IntersectionObserver;

  readonly PAGE_SIZE = 12;

  products = signal<ProductDto[]>([]);
  categories = signal<CategoryDto[]>([]);
  searchQuery = signal('');
  activeCategory = signal<number | 'all'>('all');
  sortBy = signal<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  loading = signal(false);
  isLoadingMore = signal(false);
  displayPage = signal(1);

  // Filter panel
  showFilters = signal(false);
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  minRating = signal<number>(0);

  filteredProducts = computed(() => {
    let list = this.products();
    if (this.activeCategory() !== 'all') {
      list = list.filter(p => p.categoryId === this.activeCategory());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.categoryName ?? '').toLowerCase().includes(q)
      );
    }
    if (this.minPrice() !== null) list = list.filter(p => p.unitPrice >= this.minPrice()!);
    if (this.maxPrice() !== null) list = list.filter(p => p.unitPrice <= this.maxPrice()!);
    if (this.minRating() > 0)    list = list.filter(p => p.rating >= this.minRating());
    const sort = this.sortBy();
    if (sort === 'price-asc')  list = [...list].sort((a, b) => a.unitPrice - b.unitPrice);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.unitPrice - a.unitPrice);
    if (sort === 'rating')     list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.minPrice() !== null) count++;
    if (this.maxPrice() !== null) count++;
    if (this.minRating() > 0) count++;
    return count;
  });

  displayedProducts = computed(() =>
    this.filteredProducts().slice(0, this.displayPage() * this.PAGE_SIZE)
  );

  hasMore = computed(() =>
    this.filteredProducts().length > this.displayPage() * this.PAGE_SIZE
  );

  cartCount = computed(() => this.cartService.count());

  constructor() {
    // Reset pagination when any filter changes
    effect(() => {
      void [this.activeCategory(), this.searchQuery(), this.sortBy(),
            this.minPrice(), this.maxPrice(), this.minRating()];
      this.displayPage.set(1);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery.set(params['search']);
    });
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: products => { this.products.set(products); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.getCategories().subscribe({
      next: cats => this.categories.set(cats),
    });
  }

  ngAfterViewInit(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && this.hasMore() && !this.isLoadingMore()) {
          this.loadNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (this.scrollSentinel?.nativeElement) {
      this.intersectionObserver.observe(this.scrollSentinel.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadNextPage(): void {
    if (!this.hasMore() || this.isLoadingMore()) return;
    this.isLoadingMore.set(true);
    // Simulate short async delay for smooth UX, then reveal next page
    setTimeout(() => {
      this.displayPage.update(p => p + 1);
      this.isLoadingMore.set(false);
    }, 400);
  }

  setCategory(cat: number | 'all'): void {
    this.activeCategory.set(cat);
  }

  clearFilters(): void {
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.minRating.set(0);
  }

  onMinPrice(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.minPrice.set(isNaN(val) ? null : val);
  }

  onMaxPrice(e: Event): void {
    const val = parseFloat((e.target as HTMLInputElement).value);
    this.maxPrice.set(isNaN(val) ? null : val);
  }

  addToCart(product: ProductDto): void {
    this.cartService.addItem(product);
  }

  isInCart(product: ProductDto): boolean {
    return this.cartService.items().some(i => i.product.id === product.id);
  }

  getStars(rating: number): string {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  navigateToProduct(id: number): void {
    this.router.navigate(['/individual/product', id]);
  }

  toggleFavorite(product: ProductDto, event: Event): void {
    event.stopPropagation();
    this.favoritesService.toggle(product.id);
  }

  isFavorite(productId: number): boolean {
    return this.favoritesService.isFavorite(productId);
  }
}
