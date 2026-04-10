import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-individual-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class IndividualCheckoutComponent {
  private cartService = inject(CartService);
  private api = inject(ApiService);
  private router = inject(Router);

  items     = computed(() => this.cartService.items());
  subtotal  = computed(() => this.cartService.total());
  shipping  = computed(() => (this.subtotal() > 100 ? 0 : 9.99));
  tax       = computed(() => this.subtotal() * 0.1);
  grandTotal = computed(() => this.subtotal() + this.shipping() + this.tax());

  paymentMethod = signal<'card' | 'transfer' | 'cash'>('card');
  placing = signal(false);
  error   = signal('');

  address = signal({ fullName: '', street: '', city: '', phone: '' });
  card    = signal({ number: '', expiry: '', cvv: '' });

  formatCardNumber(raw: string): string {
    return raw.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  }

  onCardNumber(e: Event): void {
    const val = this.formatCardNumber((e.target as HTMLInputElement).value);
    (e.target as HTMLInputElement).value = val;
    this.card.update(c => ({ ...c, number: val }));
  }

  onExpiry(e: Event): void {
    let val = (e.target as HTMLInputElement).value.replace(/\D/g, '');
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2, 4);
    (e.target as HTMLInputElement).value = val;
    this.card.update(c => ({ ...c, expiry: val }));
  }

  placeOrder(): void {
    const addr = this.address();
    if (!addr.fullName.trim() || !addr.street.trim() || !addr.city.trim()) {
      this.error.set('Lütfen teslimat bilgilerini eksiksiz doldurun.');
      return;
    }
    if (this.paymentMethod() === 'card') {
      const c = this.card();
      if (c.number.replace(/\s/g, '').length < 16 || !c.expiry || c.cvv.length < 3) {
        this.error.set('Lütfen kart bilgilerini doğru girin.');
        return;
      }
    }

    this.placing.set(true);
    this.error.set('');

    const payMethod =
      this.paymentMethod() === 'card'     ? 'CREDIT_CARD' :
      this.paymentMethod() === 'transfer' ? 'BANK_TRANSFER' : 'CASH_ON_DELIVERY';

    // Group cart items by storeId → one order per store
    const byStore = new Map<number | undefined, { productId: number; quantity: number }[]>();
    for (const item of this.items()) {
      const key = item.product.storeId;
      if (!byStore.has(key)) byStore.set(key, []);
      byStore.get(key)!.push({ productId: item.product.id, quantity: item.qty });
    }

    const requests = Array.from(byStore.entries()).map(([storeId, items]) => ({
      storeId,
      paymentMethod: payMethod,
      items,
    }));

    const createNext = (idx: number) => {
      if (idx >= requests.length) {
        this.cartService.clearCart();
        this.router.navigate(['/individual/orders']);
        return;
      }
      this.api.createOrder(requests[idx]).subscribe({
        next: () => createNext(idx + 1),
        error: (err) => {
          this.error.set(err?.error?.message || 'Sipariş oluşturulurken bir hata oluştu.');
          this.placing.set(false);
        },
      });
    };

    createNext(0);
  }
}
