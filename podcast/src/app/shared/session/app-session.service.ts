import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  UserLoginInfoDto,
  ApplicationInfoDto,
  SessionServiceProxy,
  GetCurrentLoginInformationsOutput,
  ProfileServiceProxy,
  TenantLoginInfoDto,
  DataFileServiceProxy,
  AppInformationDto,
  SaaSAppType,
} from 'src/shared/service-proxies/service-proxies';
import { AppConsts } from '../AppConsts';
import { AppBranding } from '../branding/app-branding';
import { buildTenantBrandingLogoUrl, getDefaultLoginLogo } from '../branding/tenant-branding';
import { Router } from '@angular/router';
import { idpAuthConfig } from '../idp-auth/idp-auth.config';
import { IdpProfileService } from '../idp-auth/idp-profile.service';
import { getProfilePictureSrc, IdpProfile } from '../idp-auth/idp-profile.models';
import { getStoredAccessToken } from '../idp-auth/auth-storage';
import { isTokenValid } from '../idp-auth/jwt.utils';

@Injectable({
  providedIn: 'root',
})
export class AppSessionService {
  private _user: UserLoginInfoDto | undefined;
  private _impersonatorUser: UserLoginInfoDto | undefined;
  private _tenant: TenantLoginInfoDto | undefined;
  private _impersonatorTenant: TenantLoginInfoDto | undefined;
  private _application: ApplicationInfoDto | undefined;
  private _platform: string | undefined;
  private _isIOS: boolean | undefined;
  private _profilePicture = AppConsts.appBaseUrl + '/assets/avatars/placeholder-profile.jpg';
  private _app: AppInformationDto | undefined;
  private _icon: string | undefined = AppBranding.appIcon;
  private _tenantLogoUrl: string | undefined;
  private _qrImage: string | undefined = './assets/icons/image-holder.jpg';

  constructor(
    private _sessionService: SessionServiceProxy,
    private _profileService: ProfileServiceProxy,
    private _dataFileService: DataFileServiceProxy,
    private readonly _router: Router,
    private readonly _idpProfileService: IdpProfileService,
  ) {
    this.init();
  }

  get application(): ApplicationInfoDto | undefined {
    return this._application;
  }

  get user(): UserLoginInfoDto | undefined {
    return this._user;
  }

  get userId(): number | null {
    return this.user ? this.user.id : null;
  }

  get tenant(): TenantLoginInfoDto | undefined {
    return this._tenant;
  }

  get tenancyName(): string | undefined {
    return this._tenant ? this.tenant?.tenancyName : '';
  }

  get tenantId(): number | null {
    return this.tenant ? this.tenant.id : null;
  }

  get impersonatorUser(): UserLoginInfoDto | undefined {
    return this._impersonatorUser;
  }

  get impersonatorUserId(): number | null {
    return this.impersonatorUser ? this.impersonatorUser.id : null;
  }

  get impersonatorTenant(): TenantLoginInfoDto | undefined {
    return this._impersonatorTenant;
  }

  set application(val: ApplicationInfoDto) {
    this._application = val;
  }

  get isIOS(): boolean | undefined {
    return this._isIOS;
  }

  get isMobile(): boolean | undefined {
    return this._platform == 'ios' || this._platform == 'android';
  }

  get profilePicture(): string | undefined {
    return this._profilePicture;
  }

  get app(): AppInformationDto | undefined {
    return this._app;
  }

  get appUrl(): string | undefined {
    return this._app?.appUrl;
  }

  get saasType(): SaaSAppType | undefined {
    return this._app?.saaSType;
  }

  get appIcon(): string | undefined {
    return this._tenantLogoUrl ?? this._icon;
  }

  get loginLogo(): string {
    return this._tenantLogoUrl ?? getDefaultLoginLogo();
  }

  get qrImage(): string | undefined {
    return this._qrImage;
  }

  getProfilePicture(): void {
    this._profileService.getProfilePicture().subscribe((result) => {
      if (result && result.profilePicture) {
        this._profilePicture = 'data:image/jpeg;base64,' + result.profilePicture;
      }
    });
  }

  setQRImage(): void {
    this._dataFileService.getrawbinary(this.tenant?.communityCodeImageId).subscribe((result) => {
      if (result) {
        this._qrImage = 'data:image/jpeg;base64,' + result;
      }
    });
  }

  setIcon(imageId: string | undefined): void {
    if (!imageId || this._tenantLogoUrl) {
      return;
    }

    this._dataFileService.getraw(imageId).subscribe((result) => {
      if (result && !this._tenantLogoUrl) {
        this._icon = 'data:image/jpeg;base64,' + result;
      }
    });
  }

  /** Use the public branding URL directly — img tags load cross-origin without CORS (fetch does not). */
  private applyTenantBrandingUrl(): void {
    const tenancyName = this._tenant?.tenancyName ?? idpAuthConfig.tenancyName;
    const logoUrl = buildTenantBrandingLogoUrl(tenancyName);
    if (!logoUrl) {
      return;
    }

    if (this._tenantLogoUrl === logoUrl) {
      return;
    }

    this._tenantLogoUrl = logoUrl;
    abp.event.trigger('app.branding.changed');
  }

  clearTenantBrandingUrl(): void {
    if (!this._tenantLogoUrl) {
      return;
    }
    this._tenantLogoUrl = undefined;
    abp.event.trigger('app.branding.changed');
  }

  setUser(name: string, surname: string) {
    this._user!.name = name;
    this._user!.surname = surname;
  }

  applyIdpProfileUpdate(profile: Pick<IdpProfile, 'name' | 'surname' | 'email' | 'photoUrl'>) {
    if (!this._user) return;
    if (profile.name != null) this._user.name = profile.name;
    if (profile.surname != null) this._user.surname = profile.surname;
    if (profile.email != null) {
      this._user.emailAddress = profile.email;
      this._user.userName = profile.email;
    }
    const photo = getProfilePictureSrc(profile);
    if (photo) {
      this._profilePicture = photo;
    }
  }

  isBusy: boolean | undefined;

  init(): Promise<boolean> {
    this._platform = Capacitor.getPlatform();
    this._isIOS = this._platform == 'ios';
    this.applyTenantBrandingUrl();
    return new Promise<boolean>((resolve, reject) => {
      this._sessionService
        .getCurrentLoginInformations()
        .toPromise()
        .then(
          (result: GetCurrentLoginInformationsOutput | undefined) => {
            if (!result?.tenant && this.isMobile) {
              if (!window.config.BuildTenantId) {
                this.applyTenantBrandingUrl();
                this._router.navigate(['/auth/onboarding']);
                return;
              }
            }
            this._application = result?.application;
            this._user = result?.user;
            this._tenant = result?.tenant;
            if (this._tenant) {
              this.setQRImage();
            }
            this._impersonatorTenant = result?.impersonatorTenant;
            this._impersonatorUser = result?.impersonatorUser;
            this._app = result?.app;
            this.setIcon(result?.app?.iconId);

            const finishInit = () => {
              this.applyTenantBrandingUrl();
              resolve(true);
            };

            if (this._user) {
              abp.event.trigger('abp.session.user');
              this.getProfilePicture();
              void finishInit();
              return;
            }

            if (idpAuthConfig.enabled) {
              void this.hydrateUserFromIdpProfile().then(() => {
                if (this._user) {
                  abp.event.trigger('abp.session.user');
                }
                void finishInit();
              });
              return;
            }

            void finishInit();
          },
          (err) => {
            reject(err);
            abp.event.trigger('showModal', {
              title: 'Server Error',
              content: `
              <p class="text-center">
                Server is temporarily unavailable. Please try again after a few minutes.
              </p>
              `,
              buttonText: 'Retry',
              buttonTextSecondary: undefined,
              onPositive: () => {
                window.location.href = '/';
              },
              onNegative: () => {
                window.location.href = '/';
              },
            });
            resolve(false);
          },
        );
    });
  }

  getShownLoginName(): string | undefined {
    return this._user?.userName;
  }

  private async hydrateUserFromIdpProfile(): Promise<void> {
    const token = getStoredAccessToken() || abp.auth.getToken();
    if (!isTokenValid(token) || !idpAuthConfig.tenancyName) return;

    const profile = await this._idpProfileService.getProfile(token!, idpAuthConfig.tenancyName);
    if (!profile) return;

    const numericId =
      typeof profile.id === 'number' ? profile.id : parseInt(String(profile.id), 10) || 0;
    const user = new UserLoginInfoDto();
    user.id = numericId;
    user.name = profile.name ?? '';
    user.surname = profile.surname ?? '';
    user.emailAddress = profile.email ?? '';
    user.userName = profile.email ?? '';
    this._user = user;

    const photo = getProfilePictureSrc(profile);
    if (photo) {
      this._profilePicture = photo;
    }

    if (!this._tenant && idpAuthConfig.tenancyName) {
      const tenant = new TenantLoginInfoDto();
      tenant.tenancyName = idpAuthConfig.tenancyName;
      this._tenant = tenant;
    }
  }
}
