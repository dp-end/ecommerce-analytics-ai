import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  toastService = inject(ToastService);

  getIcon(type: Toast['type']): string {
    const map: Record<Toast['type'], string> = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    '🔔',
    };
    return map[type];
  }
}
