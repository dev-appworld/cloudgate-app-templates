import { environment } from '../../environments/environment';

function getTenancyFromQuery(): string {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('idp_tenant') || params.get('tenant');
  return fromQuery?.trim() ?? '';
}

function getTenancyFromSubdomain(): string {
  const hostname = window.location.hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost') return '';
  const parts = hostname.split('.');
  if (hostname.endsWith('.localhost') && parts.length >= 2) return parts[0];
  return parts.length > 2 ? parts[0] : '';
}

const idpBaseUrl = environment.idpBaseUrl.trim();
const idpApiUrl = environment.idpApiUrl.trim();
const idpTenancyNameEnv = environment.idpTenancyName.trim();
const idpReturnUrlEnv = environment.idpReturnUrl.trim();

export const idpAuthConfig = {
  get baseUrl() {
    return idpBaseUrl;
  },
  get apiUrl() {
    return idpApiUrl || idpBaseUrl;
  },
  get tenancyName() {
    return getTenancyFromQuery() || idpTenancyNameEnv || getTenancyFromSubdomain();
  },
  get enabled() {
    return Boolean(this.baseUrl && this.tenancyName);
  },
  get loginUrl() {
    const base = this.baseUrl.replace(/\/$/, '');
    return `${base}/idp/${encodeURIComponent(this.tenancyName)}/login`;
  },
  get returnUrl() {
    if (idpReturnUrlEnv) return idpReturnUrlEnv;
    return `${window.location.origin}/`;
  },
  buildLoginUrl(returnUrl?: string) {
    const base = this.loginUrl;
    const target = (returnUrl ?? this.returnUrl).trim();
    if (!target) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}returnUrl=${encodeURIComponent(target)}`;
  },
};
