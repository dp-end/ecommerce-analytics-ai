import { Component, signal, computed, ViewChild, ElementRef, AfterViewChecked, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { MockDataService } from '../../core/services/mock-data.service';

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

  private mockData = inject(MockDataService);

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
      content: 'Hello! I\'m your AI Data Assistant. I can analyze your store data, generate charts, and provide actionable insights. What would you like to explore today?',
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
      if (!canvas) {
        this.pendingCharts.push(chartId);
        continue;
      }
      this.createChart(chartId, canvas);
    }
  }

  private createChart(chartId: string, canvas: HTMLCanvasElement): void {
    let chart: Chart | null = null;

    if (chartId.includes('weekly')) {
      const data = this.mockData.getWeeklyRevenue();
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{ label: 'Revenue ($)', data: data.data, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#7c3aed', pointRadius: 4 }],
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
      const data = this.mockData.getAnalyticsData();
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{ label: 'New Customers', data: data.customers, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e' } }, scales: { x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } }, y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.4)' } } } },
      });
    } else if (chartId.includes('category')) {
      const data = this.mockData.getCategoryBreakdown();
      chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: data.labels,
          datasets: [{ data: data.data, backgroundColor: ['#7c3aed','#2563eb','#10b981','#06b6d4','#f59e0b','#f97316'], borderColor: '#161b22', borderWidth: 3 }],
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

    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

    const { content, hasChart, chartId } = this.generateResponse(messageText);
    const botMsg: ChatMessage = {
      id: this.nextId++,
      role: 'assistant',
      content,
      hasChart,
      chartId,
      timestamp: new Date(),
    };

    this.messages.update(msgs => [...msgs, botMsg]);
    this.isTyping.set(false);

    if (hasChart && chartId) {
      this.pendingCharts.push(chartId);
    }
  }

  private generateResponse(text: string): { content: string; hasChart?: boolean; chartId?: string } {
    const lower = text.toLowerCase();
    const id = Date.now().toString();

    if (lower.includes('weekly') || lower.includes('revenue trend')) {
      return {
        content: '📊 Here\'s your weekly revenue trend analysis. This week totaled $77,700 across 7 days. Friday and Saturday are your peak revenue days, contributing 37% of weekly sales. Consider running promotions on slower weekdays (Monday-Wednesday) to balance the distribution.',
        hasChart: true,
        chartId: `weekly-${id}`,
      };
    }
    if (lower.includes('product') || lower.includes('top 5')) {
      return {
        content: '🏆 Here are your top 5 performing products by units sold. Running Shoes leads with 312 units, followed by Wireless Headphones at 234. Your electronics category is driving strong volume. Consider expanding the Sports category given its growth trajectory.',
        hasChart: true,
        chartId: `products-${id}`,
      };
    }
    if (lower.includes('order') || lower.includes('status')) {
      return {
        content: '📦 Order status breakdown shows 42% of orders completed successfully. You have 10% pending orders that need attention — consider streamlining your fulfillment process to reduce processing time. The 5% cancellation rate is within acceptable range but could be improved.',
        hasChart: true,
        chartId: `orders-${id}`,
      };
    }
    if (lower.includes('rating') || lower.includes('review')) {
      return {
        content: '⭐ Your rating distribution looks healthy! 53% of reviews are 5-star and 28% are 4-star, giving you an excellent overall average of 4.6/5. The 7% negative reviews (1-2 stars) should be prioritized for response to maintain customer trust.',
        hasChart: true,
        chartId: `ratings-${id}`,
      };
    }
    if (lower.includes('customer') || lower.includes('growth')) {
      return {
        content: '👥 Customer growth trend shows consistent month-over-month increase. You acquired 510 new customers in December — your best month ever. Q4 showed 42% growth vs Q3. The upcoming spring season is a great opportunity to invest in acquisition campaigns.',
        hasChart: true,
        chartId: `customers-${id}`,
      };
    }
    if (lower.includes('category') || lower.includes('breakdown')) {
      return {
        content: '🗂️ Electronics dominates at 35% of your revenue mix, followed by Fashion at 22%. Your Food & Kitchen segment, while small at 15%, has the highest repeat purchase rate. Consider cross-selling strategies between Electronics and Home categories.',
        hasChart: true,
        chartId: `category-${id}`,
      };
    }

    const fallbacks = [
      'I analyzed your store data and found some interesting patterns. Your peak sales hours are between 6-9 PM, and mobile purchases account for 68% of total orders. I recommend optimizing your mobile checkout experience for even better conversions.',
      'Based on your recent data, your customer retention rate is 73%, which is above the industry average of 65%. Your loyalty program is working well — Gold members spend 3.2x more than Bronze members on average.',
      'Looking at your inventory data, you have 3 products with stock below 20 units that are also in your top 10 bestsellers. I recommend restocking Wireless Headphones, Smart Watch, and the Ergonomic Chair before they go out of stock.',
      'Your conversion funnel shows that 68% of cart abandonments happen at the shipping cost reveal step. Offering free shipping above $50 could potentially recover 15-20% of those lost sales based on industry benchmarks.',
    ];

    return {
      content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    };
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
