import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { getProfileDisplayName } from '../auth/idp-profile.models';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="page-home">
      <div>
        <h1>Welcome back, {{ displayName() }}</h1>
        <p class="subtitle">
          You are signed in via the IdP login flow. This is a placeholder home page.
        </p>
      </div>

      <div class="card-grid">
        @for (title of cards; track title) {
          <div class="card">
            <p class="card-title">{{ title }}</p>
            <p class="card-text">Placeholder content.</p>
          </div>
        }
      </div>

      <div class="placeholder-box">Start building your app here.</div>
    </div>
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  protected readonly cards = ['Overview', 'Activity', 'Settings'];

  protected displayName() {
    const user = this.auth.currentUser()?.user;
    return getProfileDisplayName({
      name: user?.name,
      surname: user?.surname,
      emailAddress: user?.emailAddress,
    });
  }
}
