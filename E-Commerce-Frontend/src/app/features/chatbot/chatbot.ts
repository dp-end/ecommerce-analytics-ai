import {
  Component,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnInit,
  inject,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PlotlyFigure } from '../../core/models/api.models';

// Plotly is loaded via CDN in index.html
declare const Plotly: {
  newPlot(el: HTMLElement, data: unknown[], layout: unknown, config?: unknown): Promise<void>;
  purge(el: HTMLElement): void;
};

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sqlQuery?: string;
  plotlyFigure?: PlotlyFigure;
  agentTrace?: string[];
  iterationCount?: number;
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
  private auth = inject(AuthService);
  private ngZone = inject(NgZone);

  inputText = signal('');
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([]);

  /** chart div IDs waiting for Plotly to render */
  private pendingPlots: { id: number; figure: PlotlyFigure }[] = [];
  private renderedPlotIds = new Set<number>();
  private nextId = 1;

  suggestions: SuggestionChip[] = [
    { label: 'Show weekly revenue trend', icon: '📈' },
    { label: 'Top 5 products by sales', icon: '🏆' },
    { label: 'Show order status breakdown', icon: '📦' },
    { label: 'Customer rating distribution', icon: '⭐' },
    { label: 'Revenue by category', icon: '🗂️' },
    { label: 'How many orders were shipped by air?', icon: '✈️' },
  ];

  ngOnInit(): void {
    const user = this.auth.currentUser();
    const name = user?.name ? user.name.split(' ')[0] : 'there';
    this.messages.set([
      {
        id: this.nextId++,
        role: 'assistant',
        content: `Hello ${name}! I'm your AI Text2SQL Assistant powered by a multi-agent pipeline.\n\nAsk me anything about your store data — I'll generate SQL queries, analyse the results, and create charts when useful.\n\nWhat would you like to explore today?`,
        timestamp: new Date(),
      },
    ]);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
    this.renderPendingPlots();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  /** Render any Plotly charts that were queued after the DOM updated. */
  private renderPendingPlots(): void {
    if (this.pendingPlots.length === 0) return;
    if (typeof Plotly === 'undefined') return;

    const remaining: typeof this.pendingPlots = [];

    for (const pending of this.pendingPlots) {
      if (this.renderedPlotIds.has(pending.id)) continue;

      const el = document.getElementById(`plotly-chart-${pending.id}`);
      if (!el) {
        remaining.push(pending);
        continue;
      }

      const darkLayout = {
        ...pending.figure.layout,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#c9d1d9' },
        xaxis: {
          ...((pending.figure.layout as Record<string, unknown>)['xaxis'] as object ?? {}),
          gridcolor: 'rgba(48,54,61,0.6)',
          tickfont: { color: '#8b949e' },
        },
        yaxis: {
          ...((pending.figure.layout as Record<string, unknown>)['yaxis'] as object ?? {}),
          gridcolor: 'rgba(48,54,61,0.6)',
          tickfont: { color: '#8b949e' },
        },
        legend: { font: { color: '#8b949e' } },
        margin: { l: 50, r: 20, t: 50, b: 60 },
      };

      const config = {
        responsive: true,
        displayModeBar: false,
        scrollZoom: false,
      };

      this.renderedPlotIds.add(pending.id);
      Plotly.newPlot(el, pending.figure.data as unknown[], darkLayout, config).catch(
        (err: unknown) => console.warn('Plotly render error:', err),
      );
    }

    this.pendingPlots = remaining;
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
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.isTyping.set(true);

    this.api.askChatbot(messageText).subscribe({
      next: (res) => {
        // Normalise field names (Spring Boot uses camelCase, Python uses snake_case)
        const plotlyFigure: PlotlyFigure | undefined =
          res.visualizationData ?? res.visualization_data ?? undefined;
        const sqlQuery: string | undefined =
          res.sql_query ?? res.sql ?? undefined;
        const agentTrace: string[] | undefined =
          res.agentTrace ?? res.agent_trace ?? undefined;
        const iterationCount: number | undefined =
          res.iterationCount ?? res.iteration_count ?? undefined;

        const botMsg: ChatMessage = {
          id: this.nextId++,
          role: 'assistant',
          content: res.answer || 'Yanıt alınamadı.',
          sqlQuery,
          plotlyFigure,
          agentTrace,
          iterationCount,
          timestamp: new Date(),
        };

        this.ngZone.run(() => {
          this.messages.update((msgs) => [...msgs, botMsg]);
          this.isTyping.set(false);

          if (plotlyFigure?.data?.length) {
            this.pendingPlots.push({ id: botMsg.id, figure: plotlyFigure });
          }
        });
      },
      error: () => {
        const botMsg: ChatMessage = {
          id: this.nextId++,
          role: 'assistant',
          content:
            'AI servisine bağlanılamadı. Backend ve Python AI servisinin çalıştığından emin olun.',
          timestamp: new Date(),
        };
        this.ngZone.run(() => {
          this.messages.update((msgs) => [...msgs, botMsg]);
          this.isTyping.set(false);
        });
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
    // Purge all Plotly charts
    this.messages().forEach((msg) => {
      if (msg.plotlyFigure) {
        const el = document.getElementById(`plotly-chart-${msg.id}`);
        if (el && typeof Plotly !== 'undefined') Plotly.purge(el);
      }
    });
    this.pendingPlots = [];
    this.renderedPlotIds.clear();
    this.ngOnInit();
  }
}
