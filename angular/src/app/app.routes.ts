import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LayoutComponent } from './components/layout.component';
import { HomeComponent } from './pages/home.component';
import { ProfileComponent } from './pages/profile.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'profile', component: ProfileComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
