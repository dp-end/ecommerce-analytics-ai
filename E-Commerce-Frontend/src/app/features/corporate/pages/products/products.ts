import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { CategoryDto, ProductDto, StoreDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-corporate-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class CorporateProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  readonly RENDER_LIMIT = 40;
  private intersectionObserver!: IntersectionObserver;
  private productScrollSentinelRef?: ElementRef<HTMLDivElement>;
  private filterReloadTimer?: ReturnType<typeof setTimeout>;
  private initialized = false;

  @ViewChild('productScrollSentinel')
  set productScrollSentinel(ref: ElementRef<HTMLDivElement> | undefined) {
    this.productScrollSentinelRef = ref;
    this.observeProductSentinel();
  }

  products   = signal<ProductDto[]>([]);
  myStores   = signal<StoreDto[]>([]);
  categories = signal<CategoryDto[]>([]);
  searchQuery    = signal('');
  categoryFilter = signal<number | 'all'>('all');
  showAddModal   = signal(false);
  loading        = signal(false);
  storesLoading  = signal(true);
  saving         = signal(false);
  errorMsg       = signal('');
  currentPage    = signal(0);
  totalPages     = signal(0);
  totalProducts  = signal(0);
  loadingMore    = signal(false);

  newProduct = signal({
    name: '', unitPrice: 0, stock: 0,
    description: '', emoji: '📦',
    imageUrl: '', storeId: 0, categoryId: 0,
  });

  imagePreview = signal<string>('');

  filteredProducts = computed(() => {
    let list = this.products();
    if (this.categoryFilter() !== 'all')
      list = list.filter(p => p.categoryId === this.categoryFilter());
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  });

  visibleProducts = computed(() =>
    this.filteredProducts()
  );

  hasMoreProducts = computed(() =>
    this.currentPage() + 1 < this.totalPages()
  );

  constructor() {
    effect(() => {
      void [this.searchQuery(), this.categoryFilter()];
      if (!this.initialized) return;
      this.scheduleProductReload();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.initialized = true;
    this.loadMyProducts();
    this.api.getMyStores().subscribe({
      next: stores => {
        this.myStores.set(stores);
        if (stores.length > 0)
          this.newProduct.update(p => ({ ...p, storeId: stores[0].id }));
        this.storesLoading.set(false);
      },
      error: () => this.storesLoading.set(false),
    });
    this.api.getCategories().subscribe({
      next: cats => {
        this.categories.set(cats);
        if (cats.length > 0)
          this.newProduct.update(p => ({ ...p, categoryId: cats[0].id }));
      },
    });
  }

  ngAfterViewInit(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && this.hasMoreProducts() && !this.loadingMore()) {
          this.loadMyProducts(false);
        }
      },
      { threshold: 0.1 }
    );
    this.observeProductSentinel();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
  }

  private scheduleProductReload(): void {
    if (this.filterReloadTimer) clearTimeout(this.filterReloadTimer);
    this.filterReloadTimer = setTimeout(() => this.loadMyProducts(true), 250);
  }

  private loadMyProducts(reset = true): void {
    if (this.loading() || this.loadingMore()) return;
    const page = reset ? 0 : this.currentPage() + 1;
    const category = this.categoryFilter();

    if (reset) {
      this.products.set([]);
      this.currentPage.set(0);
      this.totalPages.set(0);
      this.totalProducts.set(0);
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }

    this.api.getMyProductsPaged({
      page,
      size: this.RENDER_LIMIT,
      search: this.searchQuery().trim() || undefined,
      categoryId: category === 'all' ? undefined : category,
    }).subscribe({
      next: res => {
        this.products.update(list => reset ? res.content : [...list, ...res.content]);
        this.currentPage.set(res.currentPage);
        this.totalPages.set(res.totalPages);
        this.totalProducts.set(res.totalElements);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  private observeProductSentinel(): void {
    if (!this.intersectionObserver || !this.productScrollSentinelRef?.nativeElement) return;
    this.intersectionObserver.disconnect();
    this.intersectionObserver.observe(this.productScrollSentinelRef.nativeElement);
  }

  openAddModal(): void {
    this.errorMsg.set('');
    this.imagePreview.set('');
    this.newProduct.set({
      name: '', unitPrice: 0, stock: 0, description: '', emoji: '📦',
      imageUrl: '',
      storeId: this.myStores()[0]?.id ?? 0,
      categoryId: this.categories()[0]?.id ?? 0,
    });
    this.showAddModal.set(true);
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.errorMsg.set('Görsel 2MB\'tan küçük olmalı.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.imagePreview.set(base64);
      this.newProduct.update(p => ({ ...p, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  }

  addProduct(): void {
    const np = this.newProduct();
    if (!np.name.trim())    { this.errorMsg.set('Ürün adı boş olamaz.');        return; }
    if (np.unitPrice <= 0)  { this.errorMsg.set('Fiyat sıfırdan büyük olmalı.'); return; }
    if (np.storeId === 0)   { this.errorMsg.set('Lütfen bir mağaza seçin.');     return; }

    this.saving.set(true);
    this.errorMsg.set('');
    this.api.createProduct({
      name:        np.name,
      unitPrice:   np.unitPrice,
      stock:       np.stock,
      description: np.description,
      emoji:       np.emoji,
      imageUrl:    np.imageUrl || undefined,
      storeId:     np.storeId,
      categoryId:  np.categoryId || undefined,
    }).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.saving.set(false);
        this.loadMyProducts();
      },
      error: (err) => {
        const body = err?.error;
        if (body?.fieldErrors) {
          const msgs = Object.entries(body.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(', ');
          this.errorMsg.set(msgs);
        } else {
          this.errorMsg.set(body?.message || 'Ürün eklenirken hata oluştu.');
        }
        this.saving.set(false);
      },
    });
  }

  deleteProduct(id: number): void {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    this.api.deleteProduct(id).subscribe({
      next: () => {
        this.products.update(list => list.filter(p => p.id !== id));
        this.totalProducts.update(total => Math.max(0, total - 1));
      },
    });
  }

  getStockBadge(stock: number): string {
    if (stock === 0) return 'badge-red';
    if (stock < 20)  return 'badge-yellow';
    return 'badge-green';
  }
}
