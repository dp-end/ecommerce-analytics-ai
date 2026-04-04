import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.getCurrentRole();
  const requiredRole = route.data['role'] as string;

  if (role === requiredRole) {
    return true;
  }

  switch (role) {
    case 'admin':
      return router.createUrlTree(['/admin/dashboard']);
    case 'corporate':
      return router.createUrlTree(['/corporate/dashboard']);
    case 'individual':
      return router.createUrlTree(['/individual/home']);
    default:
      return router.createUrlTree(['/login']);
  }
};
