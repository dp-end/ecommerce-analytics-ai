import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isAuthEndpoint = req.url.includes('/api/auth/');
  const token = isAuthEndpoint ? null : localStorage.getItem('datapulse_token');
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        return handle401(req, next);
      }
      return throwError(() => err);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const authService = inject(AuthService);

  if (isRefreshing) {
    return from(
      new Promise<string>((resolve, reject) => {
        refreshQueue.push((token) => (token ? resolve(token) : reject()));
      })
    ).pipe(switchMap((token) => next(addToken(req, token))));
  }

  isRefreshing = true;

  return from(authService.refreshToken()).pipe(
    switchMap((newToken) => {
      isRefreshing = false;
      if (!newToken) {
        refreshQueue.forEach((cb) => cb(''));
        refreshQueue = [];
        return throwError(() => new Error('Session expired'));
      }
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];
      return next(addToken(req, newToken));
    }),
    catchError((err) => {
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(''));
      refreshQueue = [];
      return throwError(() => err);
    })
  );
}
