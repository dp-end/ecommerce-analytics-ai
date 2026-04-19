import { Injectable, OnDestroy, inject } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, timer, EMPTY } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
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

const RECONNECT_INTERVAL = 5000;
const WS_URL = environment.apiUrl.replace(/^http/, 'ws') + '/ws/notifications';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private socket$!: WebSocketSubject<NotificationMessage>;
  private destroy$ = new Subject<void>();
  private messages$ = new Subject<NotificationMessage>();

  readonly notifications$ = this.messages$.asObservable();

  connect(): void {
    if (!this.authService.isAuthenticated()) return;

    this.socket$ = webSocket<NotificationMessage>({
      url: WS_URL,
      openObserver: {
        next: () => console.log('[WS] Notification socket connected'),
      },
      closeObserver: {
        next: () => console.log('[WS] Notification socket disconnected'),
      },
    });

    this.socket$.pipe(
      tap(msg => {
        this.messages$.next(msg);
        this.toastService.show(msg.text, msg.type ?? 'info');
      }),
      catchError(() => {
        // Reconnect after interval
        return timer(RECONNECT_INTERVAL).pipe(
          tap(() => this.connect()),
          switchMap(() => EMPTY),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  disconnect(): void {
    this.socket$?.complete();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
