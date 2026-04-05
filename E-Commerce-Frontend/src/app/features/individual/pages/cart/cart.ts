import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';

@Component({
  selector: 'app-individual-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class IndividualCartComponent {
  cartService = inject(CartService);

  items = computed(() => this.cartService.items());
  total = computed(() => this.cartService.total());
  count = computed(() => this.cartService.count());

  shipping = computed(() => (this.total() > 100 ? 0 : 9.99));
  tax = computed(() => this.total() * 0.1);
  grandTotal = computed(() => this.total() + this.shipping() + this.tax());

  promoCode = signal('');
  promoApplied = signal(false);

  updateQty(id: number, qty: number): void {
    this.cartService.updateQty(id, qty);
  }

  removeItem(id: number): void {
    this.cartService.removeItem(id);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  applyPromo(): void {
    if (this.promoCode().trim()) {
      this.promoApplied.set(true);
    }
  }
}
