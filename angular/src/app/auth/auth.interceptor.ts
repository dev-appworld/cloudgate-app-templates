import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { getStoredAccessToken } from './auth-storage';
import { AuthService } from './auth.service';
import { isTokenValid } from './jwt.utils';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getStoredAccessToken();
  let authReq = req;
  if (token && isTokenValid(token) && !req.headers.has('Authorization')) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.headers.has('X-Retry')) {
        return throwError(() => error);
      }

      const url = req.url;
      if (url.includes('/api/idp/') && url.includes('/Refresh')) {
        return throwError(() => error);
      }

      const auth = inject(AuthService);
      return from(auth.tryRefreshOnce()).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            auth.logout(true);
            return throwError(() => error);
          }
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}`, 'X-Retry': '1' },
          });
          return next(retry);
        }),
      );
    }),
  );
};
