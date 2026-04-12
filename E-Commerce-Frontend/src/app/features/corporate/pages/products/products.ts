import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
export class CorporateProductsComponent implements OnInit {
  private api = inject(ApiService);

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

  ngOnInit(): void {
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

  private loadMyProducts(): void {
    this.loading.set(true);
    this.api.getMyProducts().subscribe({
      next: p => { this.products.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
      next: () => this.products.update(list => list.filter(p => p.id !== id)),
    });
  }

  getStockBadge(stock: number): string {
    if (stock === 0) return 'badge-red';
    if (stock < 20)  return 'badge-yellow';
    return 'badge-green';
  }
}
