import { Injectable, signal, computed } from '@angular/core';
import { ProductDto } from '../models/api.models';

export interface CartItem {
  product: ProductDto;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>([]);

  count = computed(() => this.items().reduce((sum, item) => sum + item.qty, 0));

  total = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.unitPrice * item.qty, 0)
  );

  addItem(product: ProductDto): void {
    this.items.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...items, { product, qty: 1 }];
    });
  }

  removeItem(id: number): void {
    this.items.update(items => items.filter(i => i.product.id !== id));
  }

  updateQty(id: number, qty: number): void {
    if (qty <= 0) {
      this.removeItem(id);
      return;
    }
    this.items.update(items =>
      items.map(i => (i.product.id === id ? { ...i, qty } : i))
    );
  }

  clearCart(): void {
    this.items.set([]);
  }
}
