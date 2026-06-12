import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from './environments/environment';
import { RootModule } from './root.module';

declare global {
  interface Window {
    eftSec: any;
    confetti: any;
    fwSettings: {
      widget_id: number;
    };
    FreshworksWidget?: any;
    mySwipe: any;
  }
}

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(RootModule);
