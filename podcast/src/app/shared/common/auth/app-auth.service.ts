import { Injectable } from '@angular/core';
import { AppConsts } from '../../AppConsts';
import { LocalStorageService } from '../../utils/local-storage.service';
import { XmlHttpRequestHelper } from '../../helpers/XmlHttpRequestHelper';
import { idpAuthConfig } from '../../idp-auth/idp-auth.config';
import { clearIdpSessionAndAbp } from '../../idp-auth/idp-auth.bootstrap';

@Injectable()
export class AppAuthService {
  logout(reload?: boolean, returnUrl?: string): void {
    if (idpAuthConfig.enabled) {
      clearIdpSessionAndAbp();
      new LocalStorageService().removeItem(AppConsts.authorization.encrptedAuthTokenName, () => {
        if (reload !== false) {
          if (returnUrl) {
            location.href = returnUrl;
          } else if (idpAuthConfig.loginUrl) {
            location.href = idpAuthConfig.buildLoginUrl();
          } else {
            location.href = '';
          }
        }
      });
      return;
    }

    let customHeaders = {
      Authorization: 'Bearer ' + abp.auth.getToken(),
    };

    XmlHttpRequestHelper.ajax(
      'GET',
      AppConsts.remoteServiceBaseUrl + '/api/TokenAuth/LogOut',
      customHeaders,
      null,
      () => {
        abp.auth.clearToken();
        abp.auth.clearRefreshToken();
        new LocalStorageService().removeItem(AppConsts.authorization.encrptedAuthTokenName, () => {
          if (reload !== false) {
            if (returnUrl) {
              location.href = returnUrl;
            } else {
              location.href = '';
            }
          }
        });
      },
    );
  }

  clearSession() {
    if (idpAuthConfig.enabled) {
      clearIdpSessionAndAbp();
      return;
    }
    abp.auth.clearToken();
    abp.auth.clearRefreshToken();
  }
}
