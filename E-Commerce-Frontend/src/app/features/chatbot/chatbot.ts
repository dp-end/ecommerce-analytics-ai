import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../core/services/api.service';

Chart.register(...registerables);

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  hasChart?: boolean;
  chartId?: string;
  timestamp: Date;
}

interface SuggestionChip {
  label: string;
  icon: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class ChatbotComponent implements AfterViewChecked, OnInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  private api = inject(ApiService);

  inputText = signal('');
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([]);
  private chartInstances = new Map<string, Chart>();
  private pendingCharts: string[] = [];
  private nextId = 1;

  suggestions: SuggestionChip[] = [
    { label: 'Show weekly revenue trend', icon: '📈' },
    { label: 'Top 5 products performance', icon: '🏆' },
    { label: 'Show order status breakdown', icon: '📦' },
    { label: 'Show rating distribution', icon: '⭐' },
    { label: 'Customer growth this year', icon: '👥' },
    { label: 'Revenue by category', icon: '🗂️' },
  ];

  ngOnInit(): void {
    this.messages.set([{
      id: this.nextId++,
      role: 'assistant',
      content: 'Hello! I\'m your AI Text2SQL Assistant. Ask me anything about your store data — I\'ll generate SQL queries and provide insights. What would you like to explore today?',
      timestamp: new Date(),
    }]);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
    this.renderPendingCharts();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private renderPendingCharts(): void {
    if (this.pendingCharts.length === 0) return;
    const toProcess = [...this.pendingCharts];
    this.pendingCharts = [];
    for (const chartId of toProcess) {
      if (this.chartInstances.has(chartId)) continue;
      const canvas = document.getElementById(chartId) as HTMLCanvasElement | null;
      if (!canvas) { this.pendingCharts.push(chartId); continue; }
      this.createChart(chartId, canvas);
    }
  }

  private createChart(chartId: string, canvas: HTMLCanvasElement): void {
    let chart: Chart | null = null;

    if (chartId.includes('weekly')) {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{ label: 'Revenue ($)', data: [8200, 9400, 7800, 11200, 13400, 15600, 12100], borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#7c3aed', pointRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b949e' } }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } }, y: { ticks: { color: '#8b949e', callback: v => '$' + Number(v)/1000 + 'K' }, grid: { color: 'rgba(48,54,61,0.4)' } } } },
      });
    } else if (chartId.includes('products')) {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Headphones', 'Smart Watch', 'Running Shoes', 'Speaker', 'Keyboard'],
          datasets: [{ label: 'Units Sold', data: [234, 178, 312, 189, 67], backgroundColor: ['rgba(124,58,237,0.7)','rgba(37,99,235,0.7)','rgba(16,185,129,0.7)','rgba(6,182,212,0.7)','rgba(245,158,11,0.7)'], borderRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } }, y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } } } },
      });
    } else if (chartId.includes('orders')) {
      chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'Shipped', 'Processing', 'Pending', 'Cancelled'],
          datasets: [{ data: [42, 28, 15, 10, 5], backgroundColor: ['#10b981','#06b6d4','#2563eb','#f59e0b','#ef4444'], borderColor: '#161b22', borderWidth: 3 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 11 }, padding: 10, usePointStyle: true } }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, cutout: '60%' },
      });
    } else if (chartId.includes('ratings')) {
      chart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
          datasets: [{ label: 'Reviews', data: [2, 5, 12, 28, 53], backgroundColor: ['rgba(239,68,68,0.7)','rgba(249,115,22,0.7)','rgba(245,158,11,0.7)','rgba(37,99,235,0.7)','rgba(16,185,129,0.7)'], borderRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } }, y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } } } },
      });
    } else if (chartId.includes('customers')) {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{ label: 'New Customers', data: [120, 180, 160, 240, 220, 310, 340, 290, 380, 420, 360, 510], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } }, y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } } } },
      });
    } else if (chartId.includes('category')) {
      chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['Electronics', 'Fashion', 'Food', 'Sports', 'Beauty', 'Home'],
          datasets: [{ data: [35, 22, 15, 12, 10, 6], backgroundColor: ['#7c3aed','#2563eb','#10b981','#06b6d4','#f59e0b','#f97316'], borderColor: '#161b22', borderWidth: 3 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8b949e', font: { size: 11 }, padding: 10, usePointStyle: true } }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, cutout: '60%' },
      });
    }

    if (chart) this.chartInstances.set(chartId, chart);
  }

  async sendMessage(text?: string): Promise<void> {
    const messageText = text ?? this.inputText().trim();
    if (!messageText || this.isTyping()) return;

    this.inputText.set('');

    const userMsg: ChatMessage = {
      id: this.nextId++,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.isTyping.set(true);

    this.api.askChatbot(messageText).subscribe({
      next: res => {
        const lower = res.answer.toLowerCase();
        const id = Date.now().toString();
        let chartId: string | undefined;

        if (lower.includes('weekly') || lower.includes('revenue trend')) chartId = `weekly-${id}`;
        else if (lower.includes('product') || lower.includes('top 5')) chartId = `products-${id}`;
        else if (lower.includes('order') || lower.includes('status')) chartId = `orders-${id}`;
        else if (lower.includes('rating') || lower.includes('review')) chartId = `ratings-${id}`;
        else if (lower.includes('customer') || lower.includes('growth')) chartId = `customers-${id}`;
        else if (lower.includes('category') || lower.includes('breakdown')) chartId = `category-${id}`;

        const botMsg: ChatMessage = {
          id: this.nextId++,
          role: 'assistant',
          content: res.answer,
          hasChart: !!chartId,
          chartId,
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, botMsg]);
        this.isTyping.set(false);
        if (chartId) this.pendingCharts.push(chartId);
      },
      error: () => {
        const botMsg: ChatMessage = {
          id: this.nextId++,
          role: 'assistant',
          content: 'Sorry, I could not connect to the AI service. Please ensure the backend is running and the ANTHROPIC_API_KEY is configured.',
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, botMsg]);
        this.isTyping.set(false);
      },
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.chartInstances.forEach(c => c.destroy());
    this.chartInstances.clear();
    this.pendingCharts = [];
    this.ngOnInit();
  }
}
