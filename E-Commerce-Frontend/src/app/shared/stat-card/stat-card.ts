import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css',
})
export class StatCardComponent {
  @Input() icon = '📊';
  @Input() title = 'Metric';
  @Input() value = '0';
  @Input() change = '';
  @Input() subtitle = '';
  @Input() accentColor: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'cyan' = 'purple';

  isPositive(): boolean {
    return this.change.startsWith('+');
  }

  isNegative(): boolean {
    return this.change.startsWith('-');
  }

  getAccentStyle(): string {
    const colors: Record<string, string> = {
      purple: 'rgba(124, 58, 237, 0.15)',
      blue: 'rgba(37, 99, 235, 0.15)',
      green: 'rgba(16, 185, 129, 0.15)',
      orange: 'rgba(249, 115, 22, 0.15)',
      red: 'rgba(239, 68, 68, 0.15)',
      cyan: 'rgba(6, 182, 212, 0.15)',
    };
    return colors[this.accentColor] || colors['purple'];
  }

  getIconColor(): string {
    const colors: Record<string, string> = {
      purple: '#a78bfa',
      blue: '#60a5fa',
      green: '#34d399',
      orange: '#fb923c',
      red: '#f87171',
      cyan: '#22d3ee',
    };
    return colors[this.accentColor] || colors['purple'];
  }
}
