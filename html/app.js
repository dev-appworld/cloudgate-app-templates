/* global window, document, localStorage, fetch, setInterval, clearInterval, setTimeout */

(function () {
  'use strict';

  // --- Configuration (edit these values) ---
  const IDP_CONFIG = {
    baseUrl: 'http://localhost:5173',
    apiUrl: 'http://localhost:44301',
    tenancyName: 'myapi',
    returnUrl: 'http://localhost:3000',
  };

  const IDP_ACCESS_TOKEN_KEY = 'idp_access_token';
  const IDP_REFRESH_TOKEN_KEY = 'idp_refresh_token';
  const IDP_ACCESS_TOKEN_EXPIRY_KEY = 'idp_access_token_expiry';
  const REFRESH_COOLDOWN_MS = 5000;
  const ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30;

  let state = { loading: true };
  const listeners = new Set();
  let refreshInFlight = null;
  let refreshIntervalId = null;

  // --- JWT helpers ---
  function jwtDecode(token) {
    const part = token.split('.')[1];
    if (!part) throw new Error('Invalid token');
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  }

  function isTokenValid(accessToken) {
    if (!accessToken) return false;
    try {
      const decoded = jwtDecode(accessToken);
      const now = Date.now() / 1000;
      return typeof decoded.exp === 'number' && decoded.exp > now;
    } catch {
      return false;
    }
  }

  function getTokenExpiry(accessToken) {
    if (!accessToken) return null;
    try {
      const decoded = jwtDecode(accessToken);
      return typeof decoded.exp === 'number' ? decoded.exp : null;
    } catch {
      return null;
    }
  }

  function userFromIdpToken(accessToken) {
    try {
      const decoded = jwtDecode(accessToken);
      const namePart =
        decoded.name || [decoded.given_name, decoded.family_name].filter(Boolean).join(' ').trim();
      const displayName = namePart || decoded.email || decoded.sub || 'User';
      return { id: decoded.sub ?? '', displayName, email: decoded.email, photoURL: undefined };
    } catch {
      return null;
    }
  }

  // --- IdP config ---
  function readConfig(key) {
    return String(IDP_CONFIG[key] ?? '').trim();
  }

  function getTenancyFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('idp_tenant') || params.get('tenant');
    return fromQuery && fromQuery.trim() ? fromQuery.trim() : '';
  }

  function getTenancyFromSubdomain() {
    const hostname = window.location.hostname;
    if (!hostname || hostname === '127.0.0.1' || hostname === 'localhost') return '';
    const parts = hostname.split('.');
    if (hostname.endsWith('.localhost') && parts.length >= 2) return parts[0];
    return parts.length > 2 ? parts[0] : '';
  }

  const idpAuthConfig = {
    get baseUrl() {
      return readConfig('baseUrl');
    },
    get apiUrl() {
      return readConfig('apiUrl') || readConfig('baseUrl');
    },
    get tenancyName() {
      return getTenancyFromQuery() || readConfig('tenancyName') || getTenancyFromSubdomain();
    },
    get enabled() {
      return Boolean(this.baseUrl && this.tenancyName);
    },
    get loginUrl() {
      const base = this.baseUrl.replace(/\/$/, '');
      return base + '/idp/' + encodeURIComponent(this.tenancyName) + '/login';
    },
    get returnUrl() {
      const configured = readConfig('returnUrl');
      if (configured) return configured;
      return window.location.href.split('#')[0].split('?')[0];
    },
    buildLoginUrl(returnUrl) {
      const base = this.loginUrl;
      const target = (returnUrl ?? this.returnUrl).trim();
      if (!target) return base;
      const sep = base.indexOf('?') >= 0 ? '&' : '?';
      return base + sep + 'returnUrl=' + encodeURIComponent(target);
    },
  };

  // --- Token storage ---
  function getStoredAccessToken() {
    try {
      return localStorage.getItem(IDP_ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function getStoredRefreshToken() {
    try {
      return localStorage.getItem(IDP_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function storeIdpTokens(accessToken, refreshToken, expiresIn) {
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

  function clearIdpSession() {
    try {
      localStorage.removeItem(IDP_ACCESS_TOKEN_KEY);
      localStorage.removeItem(IDP_REFRESH_TOKEN_KEY);
      localStorage.removeItem(IDP_ACCESS_TOKEN_EXPIRY_KEY);
    } catch {
      /* noop */
    }
  }

  // --- HTTP (fetch with 401 retry) ---
  async function apiFetch(url, options, retry) {
    const opts = options || {};
    const headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    const token = getStoredAccessToken();
    if (token && isTokenValid(token) && !headers.Authorization) {
      headers.Authorization = 'Bearer ' + token;
    }
    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body,
    });

    if (response.status === 401 && !retry) {
      const reqUrl = String(url);
      if (reqUrl.indexOf('/api/idp/') >= 0 && reqUrl.indexOf('/Refresh') >= 0) {
        throw new Error('Unauthorized');
      }
      const newToken = await tryRefreshOnce();
      if (newToken) {
        return apiFetch(url, opts, true);
      }
      logout(true);
      throw new Error('Unauthorized');
    }

    return response;
  }

  // --- IdP API ---
  function getProfileDisplayName(profile) {
    const namePart = [profile && profile.name, profile && profile.surname].filter(Boolean).join(' ').trim();
    return namePart || (profile && profile.email) || 'User';
  }

  function getProfilePictureSrc(profile) {
    const photoUrl = (profile && profile.photoUrl) || (profile && profile.PhotoUrl);
    return photoUrl && typeof photoUrl === 'string' ? photoUrl.trim() || undefined : undefined;
  }

  async function idpRefreshToken(refreshToken) {
    const base = idpAuthConfig.apiUrl.replace(/\/$/, '');
    const tenancyName = idpAuthConfig.tenancyName;
    if (!base || !tenancyName || !refreshToken) return null;
    const url = base + '/api/idp/' + encodeURIComponent(tenancyName) + '/Refresh';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: refreshToken, RefreshToken: refreshToken }),
      });
      if (!response.ok) return null;
      const raw = await response.json();
      const data = (raw && raw.result) || raw;
      const accessToken = data.accessToken || data.AccessToken;
      const newRefresh = data.refreshToken || data.RefreshToken;
      const expiresIn = data.expiresIn || data.ExpiresIn || 0;
      if (!accessToken) return null;
      return {
        accessToken: accessToken,
        refreshToken: newRefresh || refreshToken,
        expiresIn: expiresIn,
      };
    } catch {
      return null;
    }
  }

  async function getIdpProfile(accessToken, tenancyName) {
    const base = idpAuthConfig.apiUrl.replace(/\/$/, '');
    if (!base || !tenancyName) return null;
    const url = base + '/api/idp/' + encodeURIComponent(tenancyName) + '/profile';
    try {
      const response = await apiFetch(url, {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      if (!response.ok) return null;
      const data = await response.json();
      const r = (data && data.result) || data;
      if (!r || typeof r !== 'object' || r.id == null) return null;
      return {
        id: r.id,
        email: r.email || r.Email,
        name: r.name || r.Name,
        surname: r.surname || r.Surname,
        photoUrl: r.photoUrl || r.PhotoUrl || null,
        role: r.role || r.Role || null,
      };
    } catch {
      return null;
    }
  }

  async function updateIdpProfile(accessToken, tenancyName, input) {
    const base = idpAuthConfig.apiUrl.replace(/\/$/, '');
    if (!base || !tenancyName || !accessToken) return null;
    const url = base + '/api/idp/' + encodeURIComponent(tenancyName) + '/profile';
    try {
      const response = await apiFetch(url, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify(input),
      });
      if (!response.ok) return null;
      const data = await response.json();
      const r = (data && data.result) || data;
      if (!r || typeof r !== 'object') return null;
      const id = r.id != null ? r.id : r.Id;
      if (id == null && r.name == null && r.Name == null && r.email == null && r.Email == null) return null;
      return {
        id: id != null ? id : 0,
        email: r.email || r.Email,
        name: r.name || r.Name,
        surname: r.surname || r.Surname,
        photoUrl: r.photoUrl || r.PhotoUrl || null,
        role: r.role || r.Role || null,
      };
    } catch {
      return null;
    }
  }

  // --- Auth state ---
  function notify() {
    listeners.forEach(function (fn) {
      fn();
    });
  }

  function setState(patch) {
    state = Object.assign({}, state, patch);
    notify();
  }

  function buildCurrentUser(profile, tenancyName) {
    return {
      user: {
        id: profile.id,
        name: profile.name || '',
        surname: profile.surname || '',
        emailAddress: profile.email || '',
        userName: profile.email || '',
        photoUrl: getProfilePictureSrc(profile),
        role: profile.role != null ? profile.role : null,
      },
      tenant: { tenancyName: tenancyName || idpAuthConfig.tenancyName },
    };
  }

  function buildCurrentUserFromJwt(accessToken) {
    const base = userFromIdpToken(accessToken);
    if (!base) return null;
    const parts = String(base.displayName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const name = parts[0] || base.displayName || 'User';
    const surname = parts.length > 1 ? parts.slice(1).join(' ') : '';
    return {
      user: {
        id: base.id,
        name: name,
        surname: surname,
        emailAddress: base.email || '',
        userName: base.email || '',
        photoUrl: base.photoURL,
      },
      tenant: { tenancyName: idpAuthConfig.tenancyName },
    };
  }

  function applyTokens(accessToken, refreshToken, expiresIn) {
    storeIdpTokens(accessToken, refreshToken, expiresIn);
    setState({
      auth: { accessToken: accessToken, refreshToken: refreshToken || getStoredRefreshToken() || undefined },
    });
  }

  async function tryRefresh() {
    if (!idpAuthConfig.enabled) return null;
    const stored = getStoredRefreshToken();
    if (!stored) return null;
    const result = await idpRefreshToken(stored);
    if (!result || !isTokenValid(result.accessToken)) return null;
    applyTokens(result.accessToken, result.refreshToken, result.expiresIn);
    return result.accessToken;
  }

  async function tryRefreshOnce() {
    if (!refreshInFlight) {
      refreshInFlight = tryRefresh().finally(function () {
        setTimeout(function () {
          refreshInFlight = null;
        }, REFRESH_COOLDOWN_MS);
      });
    }
    return refreshInFlight;
  }

  async function loadProfile(accessToken) {
    if (idpAuthConfig.tenancyName) {
      const profile = await getIdpProfile(accessToken, idpAuthConfig.tenancyName);
      if (profile) {
        setState({ currentUser: buildCurrentUser(profile) });
        return;
      }
    }
    const fb = buildCurrentUserFromJwt(accessToken);
    if (fb) setState({ currentUser: fb });
  }

  function logout(redirectToLogin) {
    if (redirectToLogin === undefined) redirectToLogin = true;
    clearIdpSession();
    setState({ auth: undefined, currentUser: undefined });
    if (redirectToLogin && idpAuthConfig.enabled && idpAuthConfig.loginUrl) {
      window.location.href = idpAuthConfig.buildLoginUrl();
    }
  }

  async function updateUserProfile(input) {
    const token = getStoredAccessToken();
    if (!token || !idpAuthConfig.tenancyName) {
      throw new Error('IdP session is not available. Sign in again.');
    }
    const updated = await updateIdpProfile(token, idpAuthConfig.tenancyName, input);
    if (!updated) throw new Error('Profile update failed');
    setState({ currentUser: buildCurrentUser(updated) });
  }

  function setupProactiveRefresh() {
    if (refreshIntervalId != null) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    if (!state.auth || !state.auth.accessToken || !idpAuthConfig.enabled) return;

    async function checkAndRefresh() {
      const nowSeconds = Math.floor(Date.now() / 1000);
      let rawStored = null;
      try {
        rawStored = localStorage.getItem(IDP_ACCESS_TOKEN_EXPIRY_KEY);
      } catch {
        /* noop */
      }
      const storedExpiry = rawStored != null ? Number(rawStored) : null;
      const expirySeconds =
        storedExpiry != null && Number.isFinite(storedExpiry)
          ? storedExpiry
          : getTokenExpiry(state.auth.accessToken);
      if (expirySeconds == null) return;
      if (expirySeconds - ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS > nowSeconds) return;
      const newToken = await tryRefreshOnce();
      if (!newToken && !isTokenValid(state.auth.accessToken)) {
        logout(true);
      }
    }

    checkAndRefresh();
    refreshIntervalId = window.setInterval(checkAndRefresh, 5000);
  }

  function stripTokenParamsFromUrl() {
    const href = window.location.href;
    const hash = window.location.hash || '';
    const qIndex = href.indexOf('?');
    if (qIndex < 0) return;
    const base = href.substring(0, qIndex);
    const query = href.substring(qIndex + 1).split('#')[0];
    const params = new URLSearchParams(query);
    params.delete('access_token');
    params.delete('refresh_token');
    params.delete('expires_in');
    const remaining = params.toString();
    const next = base + (remaining ? '?' + remaining : '') + hash;
    window.location.replace(next);
  }

  async function initAuth() {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('access_token');
    const refreshFromUrl = params.get('refresh_token');
    const expiresInFromUrl = params.get('expires_in');

    if (tokenFromUrl && isTokenValid(tokenFromUrl)) {
      const expiresIn = expiresInFromUrl != null ? Number(expiresInFromUrl) : undefined;
      applyTokens(
        tokenFromUrl,
        refreshFromUrl || undefined,
        Number.isFinite(expiresIn) ? expiresIn : undefined,
      );
      stripTokenParamsFromUrl();
      await loadProfile(tokenFromUrl);
      setState({ loading: false });
      setupProactiveRefresh();
      return;
    }

    let accessToken = getStoredAccessToken() || '';

    if (!isTokenValid(accessToken)) {
      const refreshed = await tryRefreshOnce();
      if (refreshed) accessToken = refreshed;
    }

    if (!isTokenValid(accessToken)) {
      clearIdpSession();
      setState({ auth: undefined, currentUser: undefined, loading: false });
      return;
    }

    setState({
      auth: { accessToken: accessToken, refreshToken: getStoredRefreshToken() || undefined },
    });
    await loadProfile(accessToken);
    setState({ loading: false });
    setupProactiveRefresh();
  }

  // --- UI helpers ---
  function escapeHtml(value) {
    return String(value != null ? value : '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  function initialsFrom(user) {
    const a = ((user && user.name) || '').trim()[0] || '';
    const b = ((user && user.surname) || '').trim()[0] || '';
    const fallback = (((user && user.emailAddress) || 'U').trim()[0]) || 'U';
    return (a + b || fallback).toUpperCase();
  }

  function getRoute() {
    const hash = (window.location.hash || '#/').replace(/^#/, '');
    if (hash === '/profile' || hash === 'profile') return 'profile';
    return 'home';
  }

  function navigate(route) {
    window.location.hash = route === 'profile' ? '#/profile' : '#/';
  }

  // --- Render ---
  const root = document.getElementById('root');

  function renderScreenLoader() {
    root.innerHTML =
      '<div class="screen-loader"><div class="spinner" aria-hidden="true"></div><p>Loading…</p></div>';
  }

  function renderUnconfigured() {
    root.innerHTML =
      '<div class="unconfigured">' +
      '<p class="unconfigured-title">Sign-in not configured</p>' +
      '<p class="unconfigured-text">Edit <code>app.js</code> and set <code>IDP_CONFIG.baseUrl</code> and ' +
      '<code>IDP_CONFIG.tenancyName</code> to enable the IdP login flow.</p>' +
      '</div>';
  }

  function renderHome(pageEl) {
    const user = state.currentUser && state.currentUser.user;
    const displayName = getProfileDisplayName({
      name: user && user.name,
      surname: user && user.surname,
      email: user && user.emailAddress,
    });

    pageEl.innerHTML =
      '<div class="page-home">' +
      '<div><h1>Welcome back, ' + escapeHtml(displayName) + '</h1>' +
      '<p class="subtitle">You are signed in via the IdP login flow. This is a placeholder home page.</p></div>' +
      '<div class="card-grid">' +
      ['Overview', 'Activity', 'Settings']
        .map(function (title) {
          return (
            '<div class="card"><p class="card-title">' +
            escapeHtml(title) +
            '</p><p class="card-text">Placeholder content.</p></div>'
          );
        })
        .join('') +
      '</div>' +
      '<div class="placeholder-box">Start building your app here.</div>' +
      '</div>';
  }

  function renderProfile(pageEl) {
    const user = state.currentUser && state.currentUser.user;

    pageEl.innerHTML =
      '<div class="page-profile">' +
      '<div><h1>Profile</h1><p class="subtitle">Update the details on your IdP account.</p></div>' +
      '<form class="profile-form" id="profile-form">' +
      '<div id="profile-status" class="status hidden" role="alert"></div>' +
      '<div class="field"><label for="name">First name</label>' +
      '<input id="name" name="name" type="text" value="' + escapeAttr((user && user.name) || '') + '" /></div>' +
      '<div class="field"><label for="surname">Last name</label>' +
      '<input id="surname" name="surname" type="text" value="' + escapeAttr((user && user.surname) || '') + '" /></div>' +
      '<div class="field"><label for="email">Email</label>' +
      '<input id="email" name="email" type="email" value="' + escapeAttr((user && user.emailAddress) || '') + '" /></div>' +
      '<div class="form-actions"><button type="submit" class="btn btn-primary" id="save-btn">Save changes</button></div>' +
      '</form></div>';

    const profileForm = pageEl.querySelector('#profile-form');
    const statusEl = pageEl.querySelector('#profile-status');
    const saveBtn = pageEl.querySelector('#save-btn');

    profileForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      statusEl.classList.add('hidden');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      const data = new FormData(profileForm);
      try {
        await updateUserProfile({
          name: String(data.get('name') || ''),
          surname: String(data.get('surname') || ''),
          email: String(data.get('email') || ''),
        });
        statusEl.className = 'status status--success';
        statusEl.textContent = 'Profile updated.';
        statusEl.classList.remove('hidden');
        renderApp();
      } catch (error) {
        statusEl.className = 'status status--error';
        statusEl.textContent = (error && error.message) || 'Could not update profile.';
        statusEl.classList.remove('hidden');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save changes';
      }
    });
  }

  function renderLayout() {
    const user = state.currentUser && state.currentUser.user;
    const displayName = getProfileDisplayName({
      name: user && user.name,
      surname: user && user.surname,
      email: user && user.emailAddress,
    });
    const route = getRoute();

    const avatar = user && user.photoUrl
      ? '<img src="' + escapeAttr(user.photoUrl) + '" alt="" class="avatar-img" />'
      : '<span class="avatar-initials">' + escapeHtml(initialsFrom(user)) + '</span>';

    root.innerHTML =
      '<div class="layout">' +
      '<header class="header"><div class="header-inner">' +
      '<div class="header-left">' +
      '<a href="#/" class="brand" data-link>Cloudgate HTML</a>' +
      '<nav class="nav">' +
      '<a href="#/" class="nav-link' + (route === 'home' ? ' nav-link--active' : '') + '" data-link>Home</a>' +
      '<a href="#/profile" class="nav-link' + (route === 'profile' ? ' nav-link--active' : '') + '" data-link>Profile</a>' +
      '</nav></div>' +
      '<div class="user-menu">' +
      '<button type="button" class="user-menu-trigger" id="user-menu-trigger" aria-expanded="false">' +
      avatar +
      '<span class="user-menu-name">' + escapeHtml(displayName) + '</span></button>' +
      '<div class="user-menu-dropdown hidden" id="user-menu-dropdown">' +
      '<div class="user-menu-header">' +
      '<p class="user-menu-display">' + escapeHtml(displayName) + '</p>' +
      '<p class="user-menu-email">' + escapeHtml((user && user.emailAddress) || '') + '</p></div>' +
      '<a href="#/profile" class="user-menu-item" data-link>Profile</a>' +
      '<button type="button" class="user-menu-item user-menu-item--danger" id="sign-out-btn">Sign out</button>' +
      '</div></div></div></header>' +
      '<main class="main" id="page-content"></main></div>';

    const trigger = root.querySelector('#user-menu-trigger');
    const dropdown = root.querySelector('#user-menu-dropdown');
    const signOutBtn = root.querySelector('#sign-out-btn');
    const pageEl = root.querySelector('#page-content');

    trigger.addEventListener('click', function () {
      const hidden = dropdown.classList.toggle('hidden');
      trigger.setAttribute('aria-expanded', String(!hidden));
    });
    dropdown.addEventListener('mouseleave', function () {
      dropdown.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    });
    signOutBtn.addEventListener('click', function () {
      logout(true);
    });

    root.querySelectorAll('[data-link]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        const href = link.getAttribute('href') || '#/';
        window.location.hash = href.replace(/^#/, '') ? href : '#/';
      });
    });

    if (route === 'profile') {
      renderProfile(pageEl);
    } else {
      renderHome(pageEl);
    }
  }

  function renderApp() {
    if (state.loading) {
      renderScreenLoader();
      return;
    }

    if (!state.auth || !state.auth.accessToken) {
      if (idpAuthConfig.enabled && idpAuthConfig.loginUrl) {
        renderScreenLoader();
        window.location.href = idpAuthConfig.buildLoginUrl();
        return;
      }
      renderUnconfigured();
      return;
    }

    renderLayout();
  }

  // --- Bootstrap ---
  listeners.add(function () {
    if (!state.loading) setupProactiveRefresh();
  });

  window.addEventListener('hashchange', renderApp);

  initAuth().then(function () {
    if (!window.location.hash) window.location.hash = '#/';
    renderApp();
  });
})();
