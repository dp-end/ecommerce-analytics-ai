import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FavoritesService } from '../../../../core/services/favorites.service';
import { CartService } from '../../../../core/services/cart.service';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class FavoritesPageComponent {
  private router = inject(Router);
  private api = inject(ApiService);
  favoritesService = inject(FavoritesService);
  cartService = inject(CartService);

  favorites = computed(() => this.favoritesService.favorites());

  navigateToProduct(id: number): void {
    this.router.navigate(['/individual/product', id]);
  }

  removeFavorite(productId: number, event: Event): void {
    event.stopPropagation();
    this.favoritesService.toggle(productId);
  }

  addToCart(fav: any, event: Event): void {
    event.stopPropagation();
    this.cartService.addItem({
      id: fav.productId,
      name: fav.productName,
      unitPrice: fav.productPrice,
      stock: fav.productStock,
      emoji: fav.productEmoji,
      imageUrl: fav.productImageUrl,
      rating: fav.productRating,
      categoryName: fav.categoryName,
      storeName: fav.storeName,
      categoryId: 0,
      description: '',
    });
  }

  isInCart(productId: number): boolean {
    return this.cartService.items().some(i => i.product.id === productId);
  }

  getStars(rating: number): string {
    const full = Math.floor(rating ?? 0);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }
}
