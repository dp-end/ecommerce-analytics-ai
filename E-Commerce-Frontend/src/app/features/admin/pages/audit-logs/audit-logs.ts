import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuditLogDto } from '../../../../core/models/api.models';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page fade-in">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5rem">
        <div>
          <h2 style="font-size:1.375rem;font-weight:700;margin-bottom:0.25rem">Audit Logs</h2>
          <p style="color:var(--text-secondary);font-size:0.875rem">Track all system activity and user actions</p>
        </div>
        <button class="btn btn-secondary btn-sm">📥 Export Logs</button>
      </div>

      <div class="card" style="padding:1rem 1.25rem;margin-bottom:1.5rem">
        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
          <div class="search-input-wrapper" style="flex:1;max-width:360px">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-control" placeholder="Search logs..." [value]="search()" (input)="search.set($any($event.target).value)" />
          </div>
          <select class="form-control" style="width:160px" [value]="typeFilter()" (change)="typeFilter.set($any($event.target).value)">
            <option value="all">All Types</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div class="table-container" style="border:none;border-radius:var(--radius-lg)">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Action</th>
                <th>User</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-secondary)">Loading...</td></tr>
              }
              @for (log of filteredLogs(); track log.id) {
                <tr>
                  <td style="color:var(--text-muted);font-size:0.85rem">#{{ log.id }}</td>
                  <td><span class="badge" [ngClass]="getBadge(log.type)">{{ log.type }}</span></td>
                  <td style="max-width:400px">{{ log.action }}</td>
                  <td style="color:var(--text-secondary)">{{ log.userName }}</td>
                  <td style="color:var(--text-muted);white-space:nowrap">{{ formatTime(log.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`.page { display:flex;flex-direction:column; }`],
})
export class AdminAuditLogsComponent implements OnInit {
  private api = inject(ApiService);

  logs = signal<AuditLogDto[]>([]);
  loading = signal(false);
  search = signal('');
  typeFilter = signal('all');

  filteredLogs = computed(() => {
    let list = this.logs();
    if (this.typeFilter() !== 'all') list = list.filter(l => l.type.toUpperCase() === this.typeFilter());
    if (this.search()) {
      const q = this.search().toLowerCase();
      list = list.filter(l => l.action.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getAuditLogs().subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getBadge(type: string): string {
    const map: Record<string, string> = { SUCCESS: 'badge-green', WARNING: 'badge-yellow', ERROR: 'badge-red', INFO: 'badge-blue' };
    return map[type?.toUpperCase()] || 'badge-gray';
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
