import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Category {
  id: number;
  name: string;
  emoji: string;
  stores: number;
  products: number;
  revenue: string;
  active: boolean;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page fade-in">
      <div class="page-header">
        <div>
          <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem">Categories</h2>
          <p style="color:var(--text-secondary);font-size:0.875rem">Manage product categories across all stores</p>
        </div>
        <button class="btn btn-primary btn-sm">➕ Add Category</button>
      </div>

      <div class="grid grid-cols-4 gap-4">
        @for (cat of categories(); track cat.id) {
          <div class="card" style="display:flex;flex-direction:column;gap:1rem;">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="width:48px;height:48px;background:rgba(124,58,237,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">
                {{ cat.emoji }}
              </div>
              <span class="badge" [ngClass]="cat.active ? 'badge-green' : 'badge-gray'">{{ cat.active ? 'Active' : 'Inactive' }}</span>
            </div>
            <div>
              <div style="font-weight:600;margin-bottom:0.25rem">{{ cat.name }}</div>
              <div style="font-size:0.8rem;color:var(--text-muted)">{{ cat.stores }} stores &middot; {{ cat.products }} products</div>
            </div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--accent-purple-light)">{{ cat.revenue }}</div>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-secondary btn-sm" style="flex:1">Edit</button>
              <button class="btn btn-danger btn-sm">Delete</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
  `],
})
export class AdminCategoriesComponent {
  categories = signal<Category[]>([
    { id: 1, name: 'Electronics', emoji: '💻', stores: 24, products: 1240, revenue: '$485K', active: true },
    { id: 2, name: 'Fashion', emoji: '👗', stores: 31, products: 3456, revenue: '$312K', active: true },
    { id: 3, name: 'Food & Kitchen', emoji: '🍳', stores: 18, products: 892, revenue: '$156K', active: true },
    { id: 4, name: 'Sports', emoji: '⚽', stores: 15, products: 678, revenue: '$234K', active: true },
    { id: 5, name: 'Home & Garden', emoji: '🌿', stores: 22, products: 1123, revenue: '$198K', active: true },
    { id: 6, name: 'Books', emoji: '📚', stores: 12, products: 4521, revenue: '$89K', active: false },
    { id: 7, name: 'Pet Supplies', emoji: '🐾', stores: 9, products: 432, revenue: '$67K', active: true },
    { id: 8, name: 'Beauty', emoji: '✨', stores: 27, products: 2134, revenue: '$276K', active: true },
  ]);
}
