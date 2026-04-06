import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { ProductDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-corporate-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class CorporateProductsComponent implements OnInit {
  private api = inject(ApiService);

  products = signal<ProductDto[]>([]);
  searchQuery = signal('');
  categoryFilter = signal('all');
  showAddModal = signal(false);
  loading = signal(false);

  newProduct = signal({ name: '', unitPrice: 0, stock: 0, categoryName: 'Electronics', emoji: '📦', description: '' });

  categories = ['Electronics', 'Furniture', 'Food', 'Sports', 'Fashion', 'Beauty', 'Home'];

  filteredProducts = computed(() => {
    let list = this.products();
    if (this.categoryFilter() !== 'all') {
      list = list.filter(p => p.categoryName === this.categoryFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: products => { this.products.set(products); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  deleteProduct(id: number): void {
    this.api.deleteProduct(id).subscribe({
      next: () => this.products.update(prods => prods.filter(p => p.id !== id)),
    });
  }

  addProduct(): void {
    const np = this.newProduct();
    if (!np.name) return;
    this.api.createProduct({
      name: np.name,
      unitPrice: np.unitPrice,
      stock: np.stock,
      description: np.description,
      emoji: np.emoji,
    }).subscribe({
      next: created => {
        this.products.update(prods => [...prods, created]);
        this.showAddModal.set(false);
        this.newProduct.set({ name: '', unitPrice: 0, stock: 0, categoryName: 'Electronics', emoji: '📦', description: '' });
      },
    });
  }

  getStockClass(stock: number): string {
    if (stock === 0) return 'badge-red';
    if (stock < 20) return 'badge-yellow';
    return 'badge-green';
  }
}
