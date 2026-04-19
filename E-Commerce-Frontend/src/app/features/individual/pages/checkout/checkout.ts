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

  placing = signal(false);
  error   = signal('');

  address = signal({ fullName: '', street: '', city: '', phone: '' });

  private validateAddress(): boolean {
    const addr = this.address();
    if (!addr.fullName.trim() || !addr.street.trim() || !addr.city.trim()) {
      this.error.set('Lütfen teslimat bilgilerini eksiksiz doldurun.');
      return false;
    }
    return true;
  }

  payWithStripe(): void {
    if (!this.validateAddress()) return;

    this.placing.set(true);
    this.error.set('');

    const stripeItems = this.items().map(i => ({
      productId: i.product.id,
      quantity: i.qty,
    }));

    this.api.createStripeSession({
      items: stripeItems,
      successUrl: `${window.location.origin}/individual/orders?payment=success`,
      cancelUrl:  `${window.location.origin}/individual/checkout?payment=cancelled`,
    }).subscribe({
      next: ({ checkoutUrl }) => {
        this.cartService.clearCart();
        window.location.href = checkoutUrl;
      },
      error: err => {
        this.error.set(err?.error?.message || 'Stripe oturumu oluşturulamadı. Lütfen tekrar deneyin.');
        this.placing.set(false);
      },
    });
  }
}
