import { NgModule } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';
import { ErrorComponent } from './app/shared/common/error/error.component';

const routes: Routes = [
  { path: 'home', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'account',
    loadChildren: () => import('./app/modules/auth/auth.module').then((m) => m.AuthModule), //Lazy load account module
    data: { preload: true },
  },
  {
    path: 'error',
    component: ErrorComponent,
    data: { preload: true },
  },
  { path: '**', redirectTo: '/home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true, scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
  providers: [],
})
export class RootRoutingModule {
  constructor(private router: Router) {}
}
