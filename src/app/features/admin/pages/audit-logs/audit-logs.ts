import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../../core/services/mock-data.service';

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
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="info">Info</option>
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
              @for (log of filteredLogs(); track log.id) {
                <tr>
                  <td style="color:var(--text-muted);font-size:0.85rem">#{{ log.id }}</td>
                  <td>
                    <span class="badge" [ngClass]="getBadge(log.type)">{{ log.type }}</span>
                  </td>
                  <td style="max-width:400px">{{ log.action }}</td>
                  <td style="color:var(--text-secondary)">{{ log.user }}</td>
                  <td style="color:var(--text-muted);white-space:nowrap">{{ log.time }}</td>
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
export class AdminAuditLogsComponent {
  private mockData = inject(MockDataService);
  logs = this.mockData.getActivityLog();
  search = signal('');
  typeFilter = signal('all');

  filteredLogs = computed(() => {
    let list = this.logs;
    if (this.typeFilter() !== 'all') list = list.filter(l => l.type === this.typeFilter());
    if (this.search()) {
      const q = this.search().toLowerCase();
      list = list.filter(l => l.action.toLowerCase().includes(q) || l.user.toLowerCase().includes(q));
    }
    return list;
  });

  getBadge(type: string): string {
    return { success: 'badge-green', warning: 'badge-yellow', error: 'badge-red', info: 'badge-blue' }[type] || 'badge-gray';
  }
}
