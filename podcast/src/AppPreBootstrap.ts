import { Injector, Type, CompilerOptions, NgModuleRef } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Capacitor } from '@capacitor/core';
import { DateTime, Settings } from 'luxon';
import { AppConsts } from './app/shared/AppConsts';
import { LocalStorageService } from './app/shared/utils/local-storage.service';
import { LocalService } from './app/shared/session/local-storage.service';
import { UrlHelper } from './app/shared/helpers/UrlHelper';
import { XmlHttpRequestHelper } from './app/shared/helpers/XmlHttpRequestHelper';
import { LocaleMappingService } from './app/shared/locale-mapping.service';
import { environment } from './environments/environment';
import { merge as _merge } from 'lodash-es';
import {
  AccountServiceProxy,
  IsTenantAvailableInput,
  IsTenantAvailableOutput,
  TenantAvailabilityState,
} from './shared/service-proxies/service-proxies';
import { CookieTenantResolver } from './shared/multi-tenancy/tenant-resolvers/cookie-tenant-resolver';
import { QueryStringTenantResolver } from './shared/multi-tenancy/tenant-resolvers/query-string-tenant-resolver';
import { SubdomainTenantResolver } from './shared/multi-tenancy/tenant-resolvers/subdomain-tenant-resolver';
import { SubdomainTenancyNameFinder } from './shared/helpers/SubdomainTenancyNameFinder';
import { bootstrapIdpSessionFromUrl } from './app/shared/idp-auth/idp-auth.bootstrap';

export class AppPreBootstrap {
  static run(appRootUrl: string, injector: Injector, callback: () => void, resolve: any, reject: any): void {
    AppPreBootstrap.getApplicationConfig(appRootUrl, injector, () => {
      const queryStringObj = UrlHelper.getQueryParameters();
      AppPreBootstrap.getUserConfiguration(callback, injector.get(LocalService));
    });
  }

  private static getUserConfiguration(callback: () => void, localStore: LocalService): any {
    const token = abp.auth.getToken();

    let requestHeaders = AppPreBootstrap.getRequetHeadersWithDefaultValues();

    if (token) {
      requestHeaders['Authorization'] = 'Bearer ' + token;
    }

    XmlHttpRequestHelper.ajax(
      'GET',
      AppConsts.remoteServiceBaseUrl + '/AbpUserConfiguration/GetAll',
      requestHeaders,
      null,
      (response: { result: any }) => {
        let result = response.result;
        _merge(abp, result);
        abp.clock.provider = this.getCurrentClockProvider(result.clock.provider);
        AppPreBootstrap.configureLuxon();
        callback();
      },
    );
  }

  static bootstrap<TM>(
    moduleType: Type<TM>,
    compilerOptions?: CompilerOptions | CompilerOptions[],
  ): Promise<NgModuleRef<TM>> {
    return platformBrowserDynamic().bootstrapModule(moduleType, compilerOptions);
  }

  private static getApplicationConfig(appRootUrl: string, injector: Injector, callback: () => void) {
    let platform = Capacitor.getPlatform();
    let isMobile = platform === 'ios' || platform === 'android';
    let type = 'GET';
    let url = appRootUrl + 'assets/' + environment.appConfig;
    let customHeaders = isMobile
      ? [{}]
      : [
          {
            name: abp.multiTenancy.tenantIdCookieName,
            value: abp.multiTenancy.getTenantIdCookie() + '',
          },
        ];

    XmlHttpRequestHelper.ajax(
      type,
      url,
      customHeaders,
      null,
      (result: {
        localeMappings: any;
        appBaseUrl: string;
        remoteServiceBaseUrl: string;
        idpBaseUrl?: string;
        idpApiUrl?: string;
        idpTenancyName?: string;
        idpReturnUrl?: string;
      }) => {
        AppConsts.localeMappings = result.localeMappings;
        AppConsts.idpBaseUrl = result.idpBaseUrl ?? '';
        AppConsts.idpApiUrl = result.idpApiUrl ?? '';
        AppConsts.idpReturnUrl = result.idpReturnUrl ?? '';
        let platform = Capacitor.getPlatform();
        if (platform === 'ios' || platform === 'android') {
          switch (platform) {
            case 'ios':
              result.appBaseUrl = 'capacitor://localhost';
              break;
            case 'android':
              result.appBaseUrl = 'https://localhost';
              break;
          }

          AppConsts.appBaseUrlFormat = result.appBaseUrl;
          AppConsts.remoteServiceBaseUrl = result.remoteServiceBaseUrl;
          AppConsts.idpTenancyName = (result.idpTenancyName ?? '').trim();
          if (AppConsts.idpBaseUrl) {
            bootstrapIdpSessionFromUrl();
          }
          callback();
          return;
        }

        AppConsts.appBaseUrlFormat = result.appBaseUrl;
        AppConsts.remoteServiceBaseUrlFormat = result.remoteServiceBaseUrl;

        var tenancyName = AppPreBootstrap.resolveTenancyName(result.appBaseUrl);
        AppPreBootstrap.configureAppUrls(tenancyName, result.appBaseUrl, result.remoteServiceBaseUrl);
        AppConsts.idpTenancyName = (result.idpTenancyName ?? '').trim() || tenancyName || '';

        if (AppConsts.idpBaseUrl) {
          bootstrapIdpSessionFromUrl();
        }

        if (AppConsts.PreventNotExistingTenantSubdomains) {
          var subdomainTenancyNameFinder = new SubdomainTenancyNameFinder();
          if (subdomainTenancyNameFinder.urlHasTenancyNamePlaceholder(result.remoteServiceBaseUrl)) {
            const message = abp.localization.localize(
              'ThereIsNoTenantDefinedWithName{0}',
              AppConsts.localization.defaultLocalizationSourceName,
            );
            abp.message.warn(abp.utils.formatString(message, tenancyName));
            document.location.href = result.remoteServiceBaseUrl.replace(
              AppConsts.tenancyNamePlaceHolderInUrl + '.',
              '',
            );
            return;
          }
        }

        if (tenancyName == null) {
          callback();
        } else {
          AppPreBootstrap.ConfigureTenantIdCookie(injector, tenancyName, callback);
        }
      },
    );
  }

  public static resolveTenancyName(appBaseUrl: any): string {
    var subdomainTenantResolver = new SubdomainTenantResolver();
    var tenancyName = subdomainTenantResolver.resolve(appBaseUrl);
    if (tenancyName) {
      return tenancyName;
    }

    var queryStringTenantResolver = new QueryStringTenantResolver();
    tenancyName = queryStringTenantResolver.resolve();
    if (tenancyName) {
      abp.utils.setCookieValue('abp_tenancy_name', tenancyName);
      return tenancyName;
    }

    var cookieTenantResolver = new CookieTenantResolver();
    tenancyName = cookieTenantResolver.resolve();

    return tenancyName;
  }

  private static ConfigureTenantIdCookie(injector: any, tenancyName: string, callback: () => void) {
    let accountServiceProxy: AccountServiceProxy = injector.get(AccountServiceProxy);
    let input = new IsTenantAvailableInput();
    input.tenancyName = tenancyName;

    accountServiceProxy.isTenantAvailable(input).subscribe((result: IsTenantAvailableOutput) => {
      if (result.state === TenantAvailabilityState.Available) {
        abp.multiTenancy.setTenantIdCookie(result.tenantId);
      }

      callback();
    });
  }

  private static configureAppUrls(tenancyName: string, appBaseUrl: string, remoteServiceBaseUrl: string): void {
    if (tenancyName == null) {
      AppConsts.appBaseUrl = appBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '');
      AppConsts.remoteServiceBaseUrl = remoteServiceBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '');
    } else {
      AppConsts.appBaseUrl = appBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl, tenancyName);
      AppConsts.remoteServiceBaseUrl = remoteServiceBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl, tenancyName);
    }
  }

  private static getCurrentClockProvider(currentProviderName: string): abp.timing.IClockProvider {
    if (currentProviderName === 'unspecifiedClockProvider') {
      return abp.timing.unspecifiedClockProvider;
    }

    if (currentProviderName === 'utcClockProvider') {
      return abp.timing.utcClockProvider;
    }

    return abp.timing.localClockProvider;
  }

  private static getRequetHeadersWithDefaultValues(): any {
    const cookieLangValue = abp.utils.getCookieValue('Abp.Localization.CultureName');

    if (cookieLangValue) {
      let requestHeaders = {
        '.AspNetCore.Culture': 'c=' + cookieLangValue + '|uic=' + cookieLangValue,
      };
      return requestHeaders;
    }

    return [];
  }

  private static impersonatedAuthenticate(impersonationToken: string, tenantId: number, callback: () => void): void {
    abp.multiTenancy.setTenantIdCookie(tenantId);
    let requestHeaders = AppPreBootstrap.getRequetHeadersWithDefaultValues();

    XmlHttpRequestHelper.ajax(
      'POST',
      AppConsts.remoteServiceBaseUrl +
        '/api/TokenAuth/ImpersonatedAuthenticate?impersonationToken=' +
        impersonationToken,
      requestHeaders,
      null,
      (response: any) => {
        let result = response.result;
        abp.auth.setToken(result.accessToken);
        AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken, () => {
          callback();
          location.search = '';
        });
      },
    );
  }

  private static delegatedImpersonatedAuthenticate(
    userDelegationId: number,
    impersonationToken: string,
    tenantId: number,
    callback: () => void,
  ): void {
    abp.multiTenancy.setTenantIdCookie(tenantId);
    let requestHeaders = AppPreBootstrap.getRequetHeadersWithDefaultValues();

    XmlHttpRequestHelper.ajax(
      'POST',
      AppConsts.remoteServiceBaseUrl +
        '/api/TokenAuth/DelegatedImpersonatedAuthenticate?userDelegationId=' +
        userDelegationId +
        '&impersonationToken=' +
        impersonationToken,
      requestHeaders,
      null,
      (response: any) => {
        let result = response.result;
        abp.auth.setToken(result.accessToken);
        AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken, () => {
          callback();
          location.search = '';
        });
      },
    );
  }

  private static linkedAccountAuthenticate(switchAccountToken: string, tenantId: number, callback: () => void): void {
    abp.multiTenancy.setTenantIdCookie(tenantId);
    let requestHeaders = AppPreBootstrap.getRequetHeadersWithDefaultValues();

    XmlHttpRequestHelper.ajax(
      'POST',
      AppConsts.remoteServiceBaseUrl +
        '/api/TokenAuth/LinkedAccountAuthenticate?switchAccountToken=' +
        switchAccountToken,
      requestHeaders,
      null,
      (response: any) => {
        let result = response.result;
        abp.auth.setToken(result.accessToken);
        AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken, () => {
          callback();
          location.search = '';
        });
      },
    );
  }

  private static configureLuxon() {
    let luxonLocale = new LocaleMappingService().map('luxon', abp.localization.currentLanguage.name);

    DateTime.local().setLocale(luxonLocale);
    DateTime.utc().setLocale(luxonLocale);
    Settings.defaultLocale = luxonLocale;

    if (abp.clock.provider.supportsMultipleTimezone) {
      Settings.defaultZone = abp.timing.timeZoneInfo.iana.timeZoneId;
    }

    DateTime.prototype.toJSON = function () {
      if (!abp.clock.provider.supportsMultipleTimezone) {
        let localDate = this.setLocale('en');
        return localDate.toString();
      }

      let date = this.setLocale('en').setZone(abp.timing.timeZoneInfo.iana.timeZoneId) as DateTime;
      return date.toISO();
    };
  }

  private static setEncryptedTokenCookie(encryptedToken: string, callback: () => void) {
    new LocalStorageService().setItem(
      AppConsts.authorization.encrptedAuthTokenName,
      {
        token: encryptedToken,
        expireDate: new Date(new Date().getTime() + 365 * 86400000), //1 year
      },
      callback,
    );
  }
}
