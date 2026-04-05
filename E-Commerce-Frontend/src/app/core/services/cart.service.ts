import { Injectable, signal, computed } from '@angular/core';
import { MockDataService, MockProduct } from './mock-data.service';

export interface CartItem {
  product: MockProduct;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private mockData = new MockDataService();

  items = signal<CartItem[]>(this._getInitialItems());

  count = computed(() => this.items().reduce((sum, item) => sum + item.qty, 0));

  total = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.price * item.qty, 0)
  );

  private _getInitialItems(): CartItem[] {
    const products = this.mockData.getProducts();
    const headphones = products.find(p => p.name.toLowerCase().includes('headphone'));
    const watch = products.find(p => p.name.toLowerCase().includes('watch'));
    const yoga = products.find(p => p.name.toLowerCase().includes('yoga'));

    const items: CartItem[] = [];
    if (headphones) items.push({ product: headphones, qty: 1 });
    if (watch) items.push({ product: watch, qty: 2 });
    if (yoga) items.push({ product: yoga, qty: 1 });
    return items;
  }

  addItem(product: MockProduct): void {
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
