import { Component } from '@angular/core';

@Component({
  selector: 'app-screen-loader',
  standalone: true,
  template: `
    <div class="screen-loader">
      <div class="spinner" aria-hidden="true"></div>
      <p>Loading…</p>
    </div>
  `,
})
export class ScreenLoaderComponent {}
