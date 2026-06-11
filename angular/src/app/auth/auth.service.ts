import { Injectable, computed, signal } from '@angular/core';
import {
  clearIdpSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  IDP_ACCESS_TOKEN_EXPIRY_KEY,
  storeIdpTokens,
} from './auth-storage';
import { idpAuthConfig } from './idp-auth.config';
import { getProfilePictureSrc, AppUser, IdpProfile } from './idp-profile.models';
import { IdpProfileService } from './idp-profile.service';
import { getTokenExpiry, isTokenValid, userFromIdpToken } from './jwt.utils';

const REFRESH_COOLDOWN_MS = 5000;
const ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30;

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly loadingSignal = signal(true);
  private readonly authSignal = signal<AuthTokens | undefined>(undefined);
  private readonly currentUserSignal = signal<AppUser | undefined>(undefined);

  private refreshInFlight: Promise<string | null> | null = null;
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly loading = this.loadingSignal.asReadonly();
  readonly auth = this.authSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly accessToken = computed(() => this.authSignal()?.accessToken);
  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));

  constructor(private readonly idpProfile: IdpProfileService) {}

  async init(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('access_token');
    const refreshFromUrl = params.get('refresh_token');
    const expiresInFromUrl = params.get('expires_in');

    if (tokenFromUrl && isTokenValid(tokenFromUrl)) {
      const expiresIn = expiresInFromUrl != null ? Number(expiresInFromUrl) : undefined;
      this.applyTokens(
        tokenFromUrl,
        refreshFromUrl || undefined,
        Number.isFinite(expiresIn) ? expiresIn : undefined,
      );

      params.delete('access_token');
      params.delete('refresh_token');
      params.delete('expires_in');
      const search = params.toString();
      window.history.replaceState(
        {},
        '',
        window.location.pathname + (search ? `?${search}` : '') + (window.location.hash || ''),
      );

      await this.loadProfile(tokenFromUrl);
      this.loadingSignal.set(false);
      this.setupProactiveRefresh();
      return;
    }

    let accessToken = getStoredAccessToken() || '';

    if (!isTokenValid(accessToken)) {
      const refreshed = await this.tryRefreshOnce();
      if (refreshed) accessToken = refreshed;
    }

    if (!isTokenValid(accessToken)) {
      clearIdpSession();
      this.authSignal.set(undefined);
      this.currentUserSignal.set(undefined);
      this.loadingSignal.set(false);
      return;
    }

    this.authSignal.set({
      accessToken,
      refreshToken: getStoredRefreshToken() || undefined,
    });
    await this.loadProfile(accessToken);
    this.loadingSignal.set(false);
    this.setupProactiveRefresh();
  }

  logout(redirectToLogin = true) {
    clearIdpSession();
    this.authSignal.set(undefined);
    this.currentUserSignal.set(undefined);
    this.clearProactiveRefresh();
    if (redirectToLogin && idpAuthConfig.enabled && idpAuthConfig.loginUrl) {
      window.location.href = idpAuthConfig.buildLoginUrl();
    }
  }

  async updateUserProfile(input: { name?: string; surname?: string; email?: string }) {
    const token = getStoredAccessToken();
    if (!token || !idpAuthConfig.tenancyName) {
      throw new Error('IdP session is not available. Sign in again.');
    }
    const updated = await this.idpProfile.updateProfile(token, idpAuthConfig.tenancyName, input);
    if (!updated) throw new Error('Profile update failed');
    this.currentUserSignal.set(this.buildCurrentUser(updated));
  }

  async tryRefreshOnce(): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.tryRefresh().finally(() => {
        setTimeout(() => {
          this.refreshInFlight = null;
        }, REFRESH_COOLDOWN_MS);
      });
    }
    return this.refreshInFlight;
  }

  private async tryRefresh(): Promise<string | null> {
    if (!idpAuthConfig.enabled) return null;
    const stored = getStoredRefreshToken();
    if (!stored) return null;
    const result = await this.idpProfile.refreshToken(stored);
    if (!result || !isTokenValid(result.accessToken)) return null;
    this.applyTokens(result.accessToken, result.refreshToken, result.expiresIn);
    return result.accessToken;
  }

  private applyTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
    storeIdpTokens(accessToken, refreshToken, expiresIn);
    this.authSignal.set({
      accessToken,
      refreshToken: refreshToken || getStoredRefreshToken() || undefined,
    });
    this.setupProactiveRefresh();
  }

  private async loadProfile(accessToken: string) {
    if (idpAuthConfig.tenancyName) {
      const profile = await this.idpProfile.getProfile(accessToken, idpAuthConfig.tenancyName);
      if (profile) {
        this.currentUserSignal.set(this.buildCurrentUser(profile));
        return;
      }
    }
    const fallback = this.buildCurrentUserFromJwt(accessToken);
    if (fallback) this.currentUserSignal.set(fallback);
  }

  private buildCurrentUser(profile: IdpProfile, tenancyName?: string): AppUser {
    return {
      user: {
        id: profile.id,
        name: profile.name ?? '',
        surname: profile.surname ?? '',
        emailAddress: profile.email ?? '',
        userName: profile.email ?? '',
        photoUrl: getProfilePictureSrc(profile),
        role: profile.role ?? null,
      },
      tenant: { tenancyName: tenancyName ?? idpAuthConfig.tenancyName },
    };
  }

  private buildCurrentUserFromJwt(accessToken: string): AppUser | null {
    const base = userFromIdpToken(accessToken);
    if (!base) return null;
    const parts = String(base.displayName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const name = parts[0] ?? base.displayName ?? 'User';
    const surname = parts.length > 1 ? parts.slice(1).join(' ') : '';
    return {
      user: {
        id: base.id,
        name,
        surname,
        emailAddress: base.email ?? '',
        userName: base.email ?? '',
        photoUrl: base.photoURL,
      },
      tenant: { tenancyName: idpAuthConfig.tenancyName },
    };
  }

  private setupProactiveRefresh() {
    this.clearProactiveRefresh();
    const auth = this.authSignal();
    if (!auth?.accessToken || !idpAuthConfig.enabled) return;

    const checkAndRefresh = async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      let rawStored: string | null = null;
      try {
        rawStored = localStorage.getItem(IDP_ACCESS_TOKEN_EXPIRY_KEY);
      } catch {
        /* noop */
      }
      const storedExpiry = rawStored != null ? Number(rawStored) : null;
      const expirySeconds =
        storedExpiry != null && Number.isFinite(storedExpiry)
          ? storedExpiry
          : getTokenExpiry(auth.accessToken);
      if (expirySeconds == null) return;
      if (expirySeconds - ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS > nowSeconds) return;
      const newToken = await this.tryRefreshOnce();
      if (!newToken && !isTokenValid(this.authSignal()?.accessToken)) {
        this.logout(true);
      }
    };

    void checkAndRefresh();
    this.refreshIntervalId = setInterval(() => void checkAndRefresh(), 5000);
  }

  private clearProactiveRefresh() {
    if (this.refreshIntervalId != null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }
}
