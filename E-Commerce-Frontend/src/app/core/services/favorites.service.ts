import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { FavoriteDto } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  favorites = signal<FavoriteDto[]>([]);
  favoriteIds = computed(() => new Set(this.favorites().map(f => f.productId)));
  count = computed(() => this.favorites().length);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loadFavorites();
      } else {
        this.favorites.set([]);
      }
    });
  }

  loadFavorites(): void {
    this.api.getFavorites().subscribe({
      next: favs => this.favorites.set(favs),
      error: () => {},
    });
  }

  isFavorite(productId: number): boolean {
    return this.favoriteIds().has(productId);
  }

  toggle(productId: number): void {
    if (this.isFavorite(productId)) {
      this.favorites.update(list => list.filter(f => f.productId !== productId));
      this.api.removeFavorite(productId).subscribe({
        error: () => this.loadFavorites(),
      });
    } else {
      this.api.addFavorite(productId).subscribe({
        next: fav => this.favorites.update(list => [...list, fav]),
        error: () => {},
      });
    }
  }
}
