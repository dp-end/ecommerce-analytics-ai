import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { CartService } from '../../../../core/services/cart.service';
import { ProductDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-individual-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class IndividualHomeComponent implements OnInit {
  private api = inject(ApiService);
  cartService = inject(CartService);

  products = signal<ProductDto[]>([]);
  searchQuery = signal('');
  activeCategory = signal('all');
  loading = signal(false);

  categories = ['all', 'Electronics', 'Furniture', 'Food', 'Sports', 'Fashion', 'Beauty', 'Home'];

  filteredProducts = computed(() => {
    let list = this.products();
    if (this.activeCategory() !== 'all') {
      list = list.filter(p => p.categoryName === this.activeCategory());
    }
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.categoryName ?? '').toLowerCase().includes(q));
    }
    return list;
  });

  cartCount = computed(() => this.cartService.count());

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: products => { this.products.set(products); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
}
