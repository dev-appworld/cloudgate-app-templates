import { Component, Injector, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import {
  AccountServiceProxy,
  ResetPasswordInput,
  SendPasswordResetCodeInput,
} from 'src/shared/service-proxies/service-proxies';
import { finalize } from 'rxjs';
import { NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { UtilsModule } from 'src/shared/utils/utils.module';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AngularSvgIconModule,
    NgClass,
    NgIf,
    ButtonComponent,
    UtilsModule,
  ],
})
export class ForgotPasswordComponent extends AppComponentBase implements OnInit {
  model: SendPasswordResetCodeInput = new SendPasswordResetCodeInput();
  form!: FormGroup;
  submitted = false;
  saving!: boolean;

  constructor(
    injector: Injector,
    private readonly _formBuilder: FormBuilder,
    private _accountService: AccountServiceProxy,
    private readonly _router: Router,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.form = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    const { email, password } = this.form.value;

    // stop here if form is invalid
    if (this.form.invalid) {
      return;
    }

    this.forgotPassword();
  }

  forgotPassword(): void {
    this.saving = true;
    // this.showMainSpinner();
    this.model.emailAddress = this.form.value['email'];
    this._accountService
      .sendPasswordResetCode(this.model)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe(
        (result: any) => {
          this.toastr.success('Reset password email sent');
          this._router.navigate(['auth/sign-in']);
        },
        (error: any) => {
          var content = '';
          try {
            content = JSON.parse(error?.response).error.message;
          } catch {
            content = error.message;
          }
          abp.event.trigger('showModal', {
            title: 'Error on Forgot Password',
            content: content,
            buttonText: 'OK',
            buttonTextSecondary: undefined,
            onPositive: () => {},
            onNegative: () => {},
          });
        },
      );
  }
}
