import { idpConfig } from '@/config/idpConfig';

class RecaptchaService {
  constructor() {
    this.siteKey = idpConfig.recaptchaSiteKey;
    this.isLoaded = false;
    this.scriptId = 'recaptcha-script';
  }

  get enabled() {
    return Boolean(this.siteKey);
  }

  useCaptcha() {
    return this.enabled;
  }

  loadScript() {
    return new Promise((resolve, reject) => {
      if (!this.enabled) {
        resolve();
        return;
      }
      if (this.isLoaded) {
        resolve();
        return;
      }
      if (document.getElementById(this.scriptId)) {
        this.isLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.id = this.scriptId;
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
      document.head.appendChild(script);
    });
  }

  /** @param {string} [action] */
  async execute(action = 'submit') {
    if (!this.enabled) return null;
    await this.loadScript();
    return new Promise((resolve, reject) => {
      if (typeof window.grecaptcha === 'undefined') {
        reject(new Error('reCAPTCHA not loaded'));
        return;
      }
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(this.siteKey, { action })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  hideBadge() {
    if (!this.enabled) return;
    if (document.getElementById('recaptcha-badge-hide')) return;
    const style = document.createElement('style');
    style.id = 'recaptcha-badge-hide';
    style.textContent = '.grecaptcha-badge { visibility: hidden !important; }';
    document.head.appendChild(style);
  }
}

export const recaptchaService = new RecaptchaService();

/**
 * Build reCAPTCHA payload for IdP API requests.
 * Prefers v3 token when site key is configured; falls back to secret for dev/testing.
 * @param {string} action
 * @returns {Promise<{ recaptchaToken?: string; recaptchaSecret?: string }>}
 */
export async function getRecaptchaPayload(action) {
  if (recaptchaService.useCaptcha()) {
    try {
      const token = await recaptchaService.execute(action);
      if (token) return { recaptchaToken: token };
    } catch {
      throw new Error('reCAPTCHA verification failed. Please try again.');
    }
  }
  if (idpConfig.recaptchaSecret) {
    return { recaptchaSecret: idpConfig.recaptchaSecret };
  }
  throw new Error(
    'reCAPTCHA is not configured. Set VITE_IDP_RECAPTCHA_SECRET in .env to the recaptchaSecret value from Cloudgate IdP Settings.',
  );
}
