import { Injector, Type, CompilerOptions, NgModuleRef } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Capacitor } from '@capacitor/core';
import { DateTime, Settings } from 'luxon';
import { AppConsts } from './app/shared/AppConsts';
import { UrlHelper } from './app/shared/helpers/UrlHelper';
import { XmlHttpRequestHelper } from './app/shared/helpers/XmlHttpRequestHelper';
import { LocaleMappingService } from './app/shared/locale-mapping.service';
import { environment } from './environments/environment';
import { CookieTenantResolver } from './shared/multi-tenancy/tenant-resolvers/cookie-tenant-resolver';
import { QueryStringTenantResolver } from './shared/multi-tenancy/tenant-resolvers/query-string-tenant-resolver';
import { SubdomainTenantResolver } from './shared/multi-tenancy/tenant-resolvers/subdomain-tenant-resolver';
import { SubdomainTenancyNameFinder } from './shared/helpers/SubdomainTenancyNameFinder';
import { bootstrapIdpSessionFromUrl } from './app/shared/idp-auth/idp-auth.bootstrap';

export class AppPreBootstrap {
  static run(appRootUrl: string, injector: Injector, callback: () => void, resolve: any, reject: any): void {
    AppPreBootstrap.getApplicationConfig(appRootUrl, injector, () => {
      AppPreBootstrap.configureMinimalAbp(callback);
    });
  }

  private static configureMinimalAbp(callback: () => void): void {
    abp.localization = abp.localization || {};
    abp.localization.currentLanguage = {
      name: 'en-US',
      displayName: 'English',
      icon: 'famfamfam-flags us',
      isDefault: true,
      isDisabled: false,
      isRightToLeft: false,
    };
    abp.auth = abp.auth || {};
    abp.auth.grantedPermissions = abp.auth.grantedPermissions || {};
    abp.clock = abp.clock || {};
    abp.clock.provider = abp.timing.localClockProvider;
    AppPreBootstrap.configureLuxon();
    callback();
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
        idpBaseUrl?: string;
        idpApiUrl?: string;
        idpTenancyName?: string;
        idpReturnUrl?: string;
        workflowGatewayUrl?: string;
        workflowEnvironment?: string;
        workflowProjectPath?: string;
        podcastCatalogRoute?: string;
      }) => {
        AppConsts.localeMappings = result.localeMappings;
        AppConsts.idpBaseUrl = result.idpBaseUrl ?? '';
        AppConsts.idpApiUrl = result.idpApiUrl ?? '';
        AppConsts.idpReturnUrl = result.idpReturnUrl ?? '';
        AppPreBootstrap.applyWorkflowConfig(result);
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
          AppConsts.idpTenancyName = (result.idpTenancyName ?? '').trim();
          if (AppConsts.idpBaseUrl) {
            bootstrapIdpSessionFromUrl();
          }
          callback();
          return;
        }

        AppConsts.appBaseUrlFormat = result.appBaseUrl;

        var tenancyName = AppPreBootstrap.resolveTenancyName(result.appBaseUrl);
        AppPreBootstrap.configureAppUrls(tenancyName, result.appBaseUrl);
        AppConsts.idpTenancyName = (result.idpTenancyName ?? '').trim() || tenancyName || '';

        if (AppConsts.idpBaseUrl) {
          bootstrapIdpSessionFromUrl();
        }

        if (AppConsts.PreventNotExistingTenantSubdomains) {
          var subdomainTenancyNameFinder = new SubdomainTenancyNameFinder();
          if (subdomainTenancyNameFinder.urlHasTenancyNamePlaceholder(result.appBaseUrl)) {
            const message = abp.localization.localize(
              'ThereIsNoTenantDefinedWithName{0}',
              AppConsts.localization.defaultLocalizationSourceName,
            );
            abp.message.warn(abp.utils.formatString(message, tenancyName));
            document.location.href = result.appBaseUrl.replace(
              AppConsts.tenancyNamePlaceHolderInUrl + '.',
              '',
            );
            return;
          }
        }

        if (tenancyName == null) {
          callback();
        } else {
          AppPreBootstrap.configureTenantIdCookie(tenancyName, callback);
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

  private static configureTenantIdCookie(tenancyName: string, callback: () => void) {
    abp.utils.setCookieValue('abp_tenancy_name', tenancyName);
    callback();
  }

  private static applyWorkflowConfig(result: {
    workflowGatewayUrl?: string;
    workflowEnvironment?: string;
    workflowProjectPath?: string;
    podcastCatalogRoute?: string;
  }): void {
    AppConsts.workflowGatewayUrl = result.workflowGatewayUrl ?? '';
    AppConsts.workflowEnvironment = (result.workflowEnvironment ?? 'sbx').trim() || 'sbx';
    AppConsts.workflowProjectPath = (result.workflowProjectPath ?? 'api').trim() || 'api';
    AppConsts.podcastCatalogRoute = (result.podcastCatalogRoute ?? 'podcasts').trim() || 'podcasts';
  }

  private static configureAppUrls(tenancyName: string, appBaseUrl: string): void {
    if (tenancyName == null) {
      AppConsts.appBaseUrl = appBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '');
    } else {
      AppConsts.appBaseUrl = appBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl, tenancyName);
    }
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
}
