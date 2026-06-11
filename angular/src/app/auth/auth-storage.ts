export const IDP_ACCESS_TOKEN_KEY = 'idp_access_token';
export const IDP_REFRESH_TOKEN_KEY = 'idp_refresh_token';
export const IDP_ACCESS_TOKEN_EXPIRY_KEY = 'idp_access_token_expiry';

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(IDP_ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(IDP_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeIdpTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
  if (!accessToken) return;
  try {
    localStorage.setItem(IDP_ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(IDP_REFRESH_TOKEN_KEY, refreshToken);
    const seconds = Number(expiresIn) || 0;
    if (seconds > 0) {
      const expiryUnix = Math.floor(Date.now() / 1000) + Math.max(0, Math.floor(seconds));
      localStorage.setItem(IDP_ACCESS_TOKEN_EXPIRY_KEY, String(expiryUnix));
    }
  } catch {
    /* noop */
  }
}

export function clearIdpSession() {
  try {
    localStorage.removeItem(IDP_ACCESS_TOKEN_KEY);
    localStorage.removeItem(IDP_REFRESH_TOKEN_KEY);
    localStorage.removeItem(IDP_ACCESS_TOKEN_EXPIRY_KEY);
  } catch {
    /* noop */
  }
}
