import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { StoreDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stores.html',
  styleUrl: './stores.css',
})
export class AdminStoresComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  stores       = signal<StoreDto[]>([]);
  searchQuery  = signal('');
  statusFilter = signal('all');
  loading      = signal(false);
  showModal    = signal(false);
  saving       = signal(false);
  errorMsg     = signal('');
  successMsg   = signal('');

  newAccount = signal({
    storeName: '', ownerName: '', email: '', password: '', category: '',
  });

  categories = ['Electronics','Fashion','Food','Furniture','Sports','Beauty','Home','Books','Toys','Automotive'];

  filteredStores = computed(() => {
    let list = this.stores();
    if (this.statusFilter() !== 'all')
      list = list.filter(s => s.status.toLowerCase() === this.statusFilter());
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.loading.set(true);
    this.api.getStores().subscribe({
      next: stores => { this.stores.set(stores); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openModal(): void {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.newAccount.set({ storeName: '', ownerName: '', email: '', password: '', category: '' });
    this.showModal.set(true);
  }

  createStore(): void {
    const f = this.newAccount();
    if (!f.storeName.trim()) { this.errorMsg.set('Mağaza adı boş olamaz.');    return; }
    if (!f.ownerName.trim()) { this.errorMsg.set('Sahip adı boş olamaz.');     return; }
    if (!f.email.trim())     { this.errorMsg.set('E-posta boş olamaz.');        return; }
    if (f.password.length < 6) { this.errorMsg.set('Şifre en az 6 karakter.'); return; }

    this.saving.set(true);
    this.errorMsg.set('');
    this.api.createStoreAccount(f).subscribe({
      next: (result) => {
        this.successMsg.set(`"${result.storeName}" mağazası oluşturuldu. Giriş: ${result.email}`);
        this.saving.set(false);
        this.loadStores();
        setTimeout(() => this.showModal.set(false), 2000);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message || 'Mağaza oluşturulamadı.');
        this.saving.set(false);
      },
    });
  }

  toggleStatus(store: StoreDto): void {
    const newStatus = store.status.toUpperCase() === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.api.updateStoreStatus(store.id, newStatus).subscribe({
      next: updated => this.stores.update(list => list.map(s => s.id === updated.id ? updated : s)),
    });
  }

  openStore(store: StoreDto): void {
    this.router.navigate(['/admin/stores', store.id]);
  }

  deleteStore(id: number): void {
    if (!confirm('Bu mağazayı silmek istediğinize emin misiniz?')) return;
    this.api.deleteStore(id).subscribe({
      next: () => this.stores.update(list => list.filter(s => s.id !== id)),
    });
  }

  getCategoryEmoji(cat?: string): string {
    const map: Record<string, string> = {
      Electronics: '💻', Fashion: '👗', Food: '🍳', Sports: '⚽',
      Furniture: '🛋️', Home: '🏠', Books: '📚', Beauty: '✨',
      Toys: '🧸', Automotive: '🚗',
    };
    return map[cat ?? ''] || '🏪';
  }
}
