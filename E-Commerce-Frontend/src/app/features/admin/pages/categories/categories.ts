import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { CategoryDto } from '../../../../core/models/api.models';

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
        <button class="btn btn-primary btn-sm" (click)="showAddForm.set(!showAddForm())">
          {{ showAddForm() ? '✕ Cancel' : '➕ Add Category' }}
        </button>
      </div>

      @if (showAddForm()) {
        <div class="card" style="padding:1.25rem">
          <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">
            <div style="flex:1;min-width:160px">
              <label style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px;display:block">Category Name</label>
              <input class="form-control" placeholder="Category name" [(ngModel)]="newName" />
            </div>
            <div style="flex:1;min-width:160px">
              <label style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px;display:block">Description</label>
              <input class="form-control" placeholder="Description" [(ngModel)]="newDesc" />
            </div>
            <button class="btn btn-primary btn-sm" (click)="addCategory()">Save</button>
          </div>
        </div>
      }

      @if (loading()) {
        <div style="text-align:center;padding:2rem;color:var(--text-secondary)">Loading categories...</div>
      } @else {
        <div class="grid grid-cols-4 gap-4">
          @for (cat of categories(); track cat.id) {
            <div class="card" style="display:flex;flex-direction:column;gap:1rem;">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="width:48px;height:48px;background:rgba(124,58,237,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">
                  {{ getCategoryEmoji(cat.name) }}
                </div>
                <span class="badge badge-green">Active</span>
              </div>
              <div>
                <div style="font-weight:600;margin-bottom:0.25rem">{{ cat.name }}</div>
                @if (cat.description) {
                  <div style="font-size:0.8rem;color:var(--text-muted)">{{ cat.description }}</div>
                }
                @if (cat.parentName) {
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">Parent: {{ cat.parentName }}</div>
                }
              </div>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-danger btn-sm" (click)="deleteCategory(cat.id)">Delete</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
  `],
})
export class AdminCategoriesComponent implements OnInit {
  private api = inject(ApiService);

  categories = signal<CategoryDto[]>([]);
  loading = signal(false);
  showAddForm = signal(false);
  newName = '';
  newDesc = '';

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.api.getCategories().subscribe({
      next: cats => { this.categories.set(cats); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addCategory(): void {
    if (!this.newName.trim()) return;
    this.api.createCategory(this.newName, this.newDesc || undefined).subscribe({
      next: cat => {
        this.categories.update(cats => [...cats, cat]);
        this.newName = '';
        this.newDesc = '';
        this.showAddForm.set(false);
      },
    });
  }

  deleteCategory(id: number): void {
    this.api.deleteCategory(id).subscribe({
      next: () => this.categories.update(cats => cats.filter(c => c.id !== id)),
    });
  }

  getCategoryEmoji(name: string): string {
    const map: Record<string, string> = {
      Electronics: '💻', Fashion: '👗', Food: '🍳', 'Food & Kitchen': '🍳',
      Sports: '⚽', 'Home & Garden': '🌿', Books: '📚', 'Pet Supplies': '🐾',
      Beauty: '✨', Home: '🏠', Furniture: '🪑',
    };
    return map[name] || '📦';
  }
}
