export const environment = {
  /** Base URL of the IdP (used to build the hosted login page URL). */
  idpBaseUrl: 'https://your-idp-host',
  /** Optional separate API base for profile/refresh. Falls back to idpBaseUrl when empty. */
  idpApiUrl: '',
  /** Tenancy name. Override at runtime via ?idp_tenant= query param. */
  idpTenancyName: 'your-tenant',
  /** Optional post-login redirect target. Defaults to this app's origin when empty. */
  idpReturnUrl: '',
};
