import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="page">
      <p class="eyebrow">Cloudgate</p>
      <h1>Angular Starter</h1>
      <p class="lead">
        Edit <code>src/app/app.component.ts</code> and save to see changes. Run
        <code>npm run build</code> when you are ready to publish.
      </p>
    </div>
    <router-outlet />
  `,
})
export class AppComponent {}
