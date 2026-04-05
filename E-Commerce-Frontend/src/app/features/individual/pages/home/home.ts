import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService, MockProduct } from '../../../../core/services/mock-data.service';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-individual-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class IndividualHomeComponent {
  private mockData = inject(MockDataService);
  cartService = inject(CartService);

  products = signal<MockProduct[]>(this.mockData.getProducts());
  searchQuery = signal('');
  activeCategory = signal('all');

  categories = ['all', 'Electronics', 'Furniture', 'Food', 'Sports', 'Fashion', 'Beauty', 'Home'];

  filteredProducts = computed(() => {
    let list = this.products();
    if (this.activeCategory() !== 'all') {
      list = list.filter(p => p.category === this.activeCategory());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list;
  });

  cartCount = computed(() => this.cartService.count());

  addToCart(product: MockProduct): void {
    this.cartService.addItem(product);
  }

  isInCart(product: MockProduct): boolean {
    return this.cartService.items().some(i => i.product.id === product.id);
  }

  getStars(rating: number): string {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }
}
