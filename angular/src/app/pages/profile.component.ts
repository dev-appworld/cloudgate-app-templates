import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-profile">
      <div>
        <h1>Profile</h1>
        <p class="subtitle">Update the details on your IdP account.</p>
      </div>

      <form class="profile-form" [formGroup]="form" (ngSubmit)="save()">
        @if (status(); as msg) {
          <div class="status" [class.status--success]="msg.type === 'success'" [class.status--error]="msg.type === 'error'" role="alert">
            {{ msg.message }}
          </div>
        }

        <div class="field">
          <label for="name">First name</label>
          <input id="name" type="text" formControlName="name" />
        </div>

        <div class="field">
          <label for="surname">Last name</label>
          <input id="surname" type="text" formControlName="surname" />
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" />
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly status = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: [''],
    surname: [''],
    email: ['', Validators.email],
  });

  constructor() {
    effect(() => {
      const user = this.auth.currentUser()?.user;
      if (!user) return;
      this.form.patchValue({
        name: user.name ?? '',
        surname: user.surname ?? '',
        email: user.emailAddress ?? '',
      });
    });
  }

  protected async save() {
    this.status.set(null);
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      await this.auth.updateUserProfile(value);
      this.status.set({ type: 'success', message: 'Profile updated.' });
    } catch (error) {
      this.status.set({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not update profile.',
      });
    } finally {
      this.saving.set(false);
    }
  }
}
