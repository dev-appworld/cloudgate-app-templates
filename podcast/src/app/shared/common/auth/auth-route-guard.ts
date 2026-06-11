import { PermissionCheckerService, RefreshTokenService } from 'abp-ng2-module';
import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  CanLoad,
  Router,
  RouterStateSnapshot,
} from '@angular/router';

import { Observable } from 'rxjs/internal/Observable';
import { of, Subject } from 'rxjs';
import { UrlHelper } from '../../helpers/UrlHelper';
import { AppSessionService } from '../../session/app-session.service';
import { idpAuthConfig } from '../../idp-auth/idp-auth.config';
import { getStoredAccessToken } from '../../idp-auth/auth-storage';
import { isTokenValid } from '../../idp-auth/jwt.utils';

@Injectable()
export class AppRouteGuard implements CanActivate, CanActivateChild, CanLoad {
  constructor(
    private _permissionChecker: PermissionCheckerService,
    private _router: Router,
    private _sessionService: AppSessionService,
    private _refreshTokenService: RefreshTokenService,
  ) {}

  canActivateInternal(data: any, state: RouterStateSnapshot | null): Observable<boolean> {
    if (UrlHelper.isInstallUrl(location.href)) {
      return of(true);
    }

    if (idpAuthConfig.enabled) {
      const token = getStoredAccessToken() || abp.auth.getToken();
      if (!isTokenValid(token) && !this._sessionService.user) {
        const returnUrl = state?.url ? `${window.location.origin}/#${state.url}` : window.location.href;
        window.location.href = idpAuthConfig.buildLoginUrl(returnUrl);
        return of(false);
      }
    }

    if (!this._sessionService.user) {
      let sessionObservable = new Subject<any>();

      this._refreshTokenService.tryAuthWithRefreshToken().subscribe(
        (autResult: boolean) => {
          if (autResult) {
            sessionObservable.next(true);
            sessionObservable.complete();
          } else {
            sessionObservable.next(false);
            sessionObservable.complete();
            if (idpAuthConfig.enabled && idpAuthConfig.loginUrl) {
              const returnUrl = state?.url ? `${window.location.origin}/#${state.url}` : window.location.href;
              window.location.href = idpAuthConfig.buildLoginUrl(returnUrl);
            } else {
              this._router.navigate(['/auth/sign-in']);
            }
          }
        },
        () => {
          sessionObservable.next(false);
          sessionObservable.complete();
          if (idpAuthConfig.enabled && idpAuthConfig.loginUrl) {
            const returnUrl = state?.url ? `${window.location.origin}/#${state.url}` : window.location.href;
            window.location.href = idpAuthConfig.buildLoginUrl(returnUrl);
          } else {
            this._router.navigate(['/auth/sign-in']);
          }
        },
      );
      return sessionObservable;
    }

    if (!data || !data['permission']) {
      return of(true);
    }

    if (this._permissionChecker.isGranted(data['permission'])) {
      return of(true);
    }

    this._router.navigate([this.selectBestRoute()]);
    return of(false);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivateInternal(route.data, state);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivate(route, state);
  }

  canLoad(route: any): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivateInternal(route.data, null);
  }

  selectBestRoute(): string {
    return '/home';
  }
}
