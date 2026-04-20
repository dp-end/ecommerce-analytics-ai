import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface NotificationMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  time: string;
  read: boolean;
}

const WS_URL = environment.apiUrl.replace(/^http/, 'ws') + '/ws-native';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private client!: Client;
  private destroy$ = new Subject<void>();
  private messages$ = new Subject<NotificationMessage>();

  readonly notifications$ = this.messages$.asObservable();

  connect(): void {
    if (!this.authService.isAuthenticated()) return;

    const token = localStorage.getItem('datapulse_token') ?? '';
    const role = this.authService.getRole();

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        this.client.subscribe('/user/queue/notifications', (msg: IMessage) => {
          this.handleMessage(msg);
        });

        if (role === 'admin') {
          this.client.subscribe('/topic/admin/notifications', (msg: IMessage) => {
            this.handleMessage(msg);
          });
        }
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  private handleMessage(msg: IMessage): void {
    try {
      const notification = JSON.parse(msg.body) as NotificationMessage;
      this.messages$.next(notification);
      this.toastService.show(notification.text, notification.type ?? 'info');
    } catch {
      // malformed message — ignore
    }
  }
}
