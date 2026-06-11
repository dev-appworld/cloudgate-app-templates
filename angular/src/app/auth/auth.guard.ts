import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { idpAuthConfig } from './idp-auth.config';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.accessToken()) return true;

  if (idpAuthConfig.enabled && idpAuthConfig.loginUrl) {
    window.location.href = idpAuthConfig.buildLoginUrl();
    return false;
  }

  return true;
};
