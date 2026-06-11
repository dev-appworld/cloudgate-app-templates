import { clearIdpSession, getStoredAccessToken, getStoredRefreshToken, storeIdpTokens } from './auth-storage';
import { isTokenValid } from './jwt.utils';

function stripIdpCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const hadTokens =
    params.has('access_token') || params.has('refresh_token') || params.has('expires_in');
  if (!hadTokens) return;

  params.delete('access_token');
  params.delete('refresh_token');
  params.delete('expires_in');
  const search = params.toString();
  const hash = window.location.hash || '';
  window.history.replaceState({}, '', window.location.pathname + (search ? `?${search}` : '') + hash);
}

function syncAbpTokens(accessToken: string, refreshToken?: string) {
  abp.auth.setToken(accessToken);
  if (refreshToken) {
    abp.auth.setRefreshToken(refreshToken);
  }
}

/** Handle IdP redirect callback and restore session from storage. Safe to call before Angular boot. */
export function bootstrapIdpSessionFromUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('access_token');
  const refreshFromUrl = params.get('refresh_token');
  const expiresInFromUrl = params.get('expires_in');

  if (tokenFromUrl && isTokenValid(tokenFromUrl)) {
    const expiresIn = expiresInFromUrl != null ? Number(expiresInFromUrl) : undefined;
    storeIdpTokens(
      tokenFromUrl,
      refreshFromUrl || undefined,
      Number.isFinite(expiresIn) ? expiresIn : undefined,
    );
    syncAbpTokens(tokenFromUrl, refreshFromUrl || getStoredRefreshToken() || undefined);
    stripIdpCallbackParams();
    return true;
  }

  const stored = getStoredAccessToken();
  if (isTokenValid(stored)) {
    syncAbpTokens(stored!, getStoredRefreshToken() || undefined);
    return true;
  }

  return false;
}

export function clearIdpSessionAndAbp() {
  clearIdpSession();
  abp.auth.clearToken();
  abp.auth.clearRefreshToken();
}
