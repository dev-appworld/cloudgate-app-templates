import { Injectable } from '@angular/core';
import { TokenService, RefreshTokenService } from 'abp-ng2-module';
import { Observable, Subject, of } from 'rxjs';
import { RefreshTokenResult, TokenAuthServiceProxy } from '../service-proxies/service-proxies';
import { AppConsts } from 'src/app/shared/AppConsts';
import { LocalStorageService } from 'src/app/shared/utils/local-storage.service';
import { idpAuthConfig } from 'src/app/shared/idp-auth/idp-auth.config';
import { IdpProfileService } from 'src/app/shared/idp-auth/idp-profile.service';
import { getStoredRefreshToken, storeIdpTokens } from 'src/app/shared/idp-auth/auth-storage';
import { isTokenValid } from 'src/app/shared/idp-auth/jwt.utils';

@Injectable({
  providedIn: 'root',
})
export class ZeroRefreshTokenService implements RefreshTokenService {
  constructor(
    private _tokenAuthService: TokenAuthServiceProxy,
    private _tokenService: TokenService,
    private _localStorageService: LocalStorageService,
    private _idpProfileService: IdpProfileService,
  ) {}

  tryAuthWithRefreshToken(): Observable<boolean> {
    if (idpAuthConfig.enabled) {
      return this.tryIdpRefresh();
    }
    return this.tryAbpRefresh();
  }

  private tryIdpRefresh(): Observable<boolean> {
    const refreshTokenObservable = new Subject<boolean>();
    const stored = getStoredRefreshToken();
    if (!stored) {
      return of(false);
    }

    void this._idpProfileService.refreshToken(stored).then((result) => {
      if (!result || !isTokenValid(result.accessToken)) {
        refreshTokenObservable.next(false);
        refreshTokenObservable.complete();
        return;
      }

      storeIdpTokens(result.accessToken, result.refreshToken, result.expiresIn);
      const tokenExpireDate = new Date(new Date().getTime() + 1000 * result.expiresIn);
      this._tokenService.setToken(result.accessToken, tokenExpireDate);
      abp.auth.setToken(result.accessToken);
      abp.auth.setRefreshToken(result.refreshToken);
      refreshTokenObservable.next(true);
      refreshTokenObservable.complete();
    });

    return refreshTokenObservable;
  }

  private tryAbpRefresh(): Observable<boolean> {
    let refreshTokenObservable = new Subject<boolean>();

    let token = this._tokenService.getRefreshToken();
    if (!token || token.trim() === '') {
      return of(false);
    }

    this._tokenAuthService.refreshToken(token).subscribe(
      (tokenResult: RefreshTokenResult) => {
        if (tokenResult && tokenResult.accessToken) {
          let tokenExpireDate = new Date(new Date().getTime() + 1000 * tokenResult.expireInSeconds);
          this._tokenService.setToken(tokenResult.accessToken, tokenExpireDate);

          this._localStorageService.setItem(
            AppConsts.authorization.encrptedAuthTokenName,
            {
              token: tokenResult.encryptedAccessToken,
              expireDate: tokenExpireDate,
            },
            () => refreshTokenObservable.next(true),
          );
        } else {
          refreshTokenObservable.next(false);
        }
      },
      () => {
        refreshTokenObservable.next(false);
      },
    );
    return refreshTokenObservable;
  }
}
