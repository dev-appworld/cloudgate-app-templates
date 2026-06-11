import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { ScreenLoaderComponent } from './components/screen-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ScreenLoaderComponent],
  template: `
    @if (auth.loading()) {
      <app-screen-loader />
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
}
