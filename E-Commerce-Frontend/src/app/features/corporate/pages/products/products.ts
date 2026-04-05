import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockProduct } from '../../../../core/services/mock-data.service';

@Component({
  selector: 'app-corporate-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class CorporateProductsComponent {
  private mockData = inject(MockDataService);

  products = signal<MockProduct[]>(this.mockData.getProducts());
  searchQuery = signal('');
  categoryFilter = signal('all');
  showAddModal = signal(false);

  newProduct = signal({ name: '', price: 0, stock: 0, category: 'Electronics', emoji: '📦', description: '' });

  categories = ['Electronics', 'Furniture', 'Food', 'Sports', 'Fashion', 'Beauty', 'Home'];

  filteredProducts = computed(() => {
    let list = this.products();
    if (this.categoryFilter() !== 'all') {
      list = list.filter(p => p.category === this.categoryFilter());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  });

  deleteProduct(id: number): void {
    this.products.update(prods => prods.filter(p => p.id !== id));
  }

  addProduct(): void {
    const np = this.newProduct();
    if (!np.name) return;
    const newProd: MockProduct = {
      id: Date.now(),
      name: np.name,
      price: np.price,
      stock: np.stock,
      category: np.category,
      emoji: np.emoji || '📦',
      rating: 0,
      reviews: 0,
      description: np.description,
    };
    this.products.update(prods => [...prods, newProd]);
    this.showAddModal.set(false);
    this.newProduct.set({ name: '', price: 0, stock: 0, category: 'Electronics', emoji: '📦', description: '' });
  }

  getStockClass(stock: number): string {
    if (stock === 0) return 'badge-red';
    if (stock < 20) return 'badge-yellow';
    return 'badge-green';
  }
}
