import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { idpAuthConfig } from '../auth/idp-auth.config';
import { getProfileDisplayName } from '../auth/idp-profile.models';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (!auth.isAuthenticated() && !idpConfig.enabled) {
      <div class="unconfigured">
        <p class="unconfigured-title">Sign-in not configured</p>
        <p class="unconfigured-text">
          Set <code>idpBaseUrl</code> and <code>idpTenancyName</code> in
          <code>src/environments/environment.ts</code> to enable the IdP login flow.
        </p>
      </div>
    } @else {
      <div class="layout">
        <header class="header">
          <div class="header-inner">
            <div class="header-left">
              <a routerLink="/" class="brand">Cloudgate Angular</a>
              <nav class="nav">
                <a routerLink="/" routerLinkActive="nav-link--active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">
                  Home
                </a>
                <a routerLink="/profile" routerLinkActive="nav-link--active" class="nav-link">Profile</a>
              </nav>
            </div>

            <div class="user-menu">
              <button
                type="button"
                class="user-menu-trigger"
                (click)="toggleMenu()"
                [attr.aria-expanded]="menuOpen()"
              >
                @if (user()?.photoUrl) {
                  <img [src]="user()!.photoUrl" alt="" class="avatar-img" />
                } @else {
                  <span class="avatar-initials">{{ initials() }}</span>
                }
                <span class="user-menu-name">{{ displayName() }}</span>
              </button>

              @if (menuOpen()) {
                <div class="user-menu-dropdown" (mouseleave)="closeMenu()">
                  <div class="user-menu-header">
                    <p class="user-menu-display">{{ displayName() }}</p>
                    <p class="user-menu-email">{{ user()?.emailAddress }}</p>
                  </div>
                  <a routerLink="/profile" class="user-menu-item" (click)="closeMenu()">Profile</a>
                  <button type="button" class="user-menu-item user-menu-item--danger" (click)="signOut()">
                    Sign out
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <main class="main">
          <router-outlet />
        </main>
      </div>
    }
  `,
})
export class LayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly idpConfig = idpAuthConfig;
  protected readonly menuOpen = signal(false);

  protected readonly user = () => this.auth.currentUser()?.user;

  protected displayName() {
    const user = this.user();
    return getProfileDisplayName({
      name: user?.name,
      surname: user?.surname,
      emailAddress: user?.emailAddress,
    });
  }

  protected initials() {
    const user = this.user();
    const a = (user?.name || '').trim()[0] || '';
    const b = (user?.surname || '').trim()[0] || '';
    const fallback = (user?.emailAddress || 'U').trim()[0] || 'U';
    return (a + b || fallback).toUpperCase();
  }

  protected toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu() {
    this.menuOpen.set(false);
  }

  protected signOut() {
    this.closeMenu();
    this.auth.logout(true);
  }
}
