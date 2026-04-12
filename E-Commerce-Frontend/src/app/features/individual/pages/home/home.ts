import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { CartService } from '../../../../core/services/cart.service';
import { CategoryDto, ProductDto } from '../../../../core/models/api.models';

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
  categories = signal<CategoryDto[]>([]);
  searchQuery = signal('');
  activeCategory = signal<number | 'all'>('all');
  sortBy = signal<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  loading = signal(false);

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
    const sort = this.sortBy();
    if (sort === 'price-asc')  list = [...list].sort((a, b) => a.unitPrice - b.unitPrice);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.unitPrice - a.unitPrice);
    if (sort === 'rating')     list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  });

  cartCount = computed(() => this.cartService.count());

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: products => { this.products.set(products); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.getCategories().subscribe({
      next: cats => this.categories.set(cats),
    });
  }

  setCategory(cat: number | 'all'): void {
    this.activeCategory.set(cat);
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
