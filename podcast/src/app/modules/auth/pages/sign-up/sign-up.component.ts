import { Component, Injector, OnInit } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { NgClass, NgIf } from '@angular/common';
import { UtilsModule } from 'src/shared/utils/utils.module';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { LoginService } from '../sign-in/login.service';
import { finalize } from 'rxjs';
import { AccountServiceProxy, RegisterInput, RegisterOutput } from 'src/shared/service-proxies/service-proxies';
import { Capacitor, Plugins } from '@capacitor/core';
const { SignInWithApple } = Plugins;

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
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
export class SignUpComponent extends AppComponentBase implements OnInit {
  model: RegisterInput = new RegisterInput();
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;
  passwordConfirmTextType!: boolean;
  saving!: boolean;
  savingGoogleLogin!: boolean;
  savingAppleLogin!: boolean;

  constructor(
    injector: Injector,
    private _loginService: LoginService,
    private readonly _formBuilder: FormBuilder,
    private _accountService: AccountServiceProxy,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.form = this._formBuilder.group(
      {
        name: ['', [Validators.required]],
        surname: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required],
        passwordConfirm: ['', Validators.required],
        terms: [false, Validators.requiredTrue],
      },
      {
        validators: this.matchValidator('password', 'passwordConfirm'),
      },
    );
  }

  matchValidator(controlName: string, matchingControlName: string): ValidatorFn {
    return (abstractControl: AbstractControl) => {
      const control = abstractControl.get(controlName);
      const matchingControl = abstractControl.get(matchingControlName);

      if (matchingControl!.errors && !matchingControl!.errors?.['confirmedValidator']) {
        return null;
      }

      if (control!.value !== matchingControl!.value) {
        const error = { confirmedValidator: 'Passwords do not match.' };
        matchingControl!.setErrors(error);
        return error;
      } else {
        matchingControl!.setErrors(null);
        return null;
      }
    };
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  togglePasswordConfirmTextType() {
    this.passwordConfirmTextType = !this.passwordConfirmTextType;
  }

  onSubmit() {
    this.submitted = true;
    const { name, surname, email, password, passwordConfirm } = this.form.value;

    // stop here if form is invalid
    if (this.form.invalid) {
      return;
    }

    this.register();
  }

  register(): void {
    this.saving = true;
    this.model.name = this.form.value['name'];
    this.model.surname = this.form.value['surname'];
    this.model.emailAddress = this.form.value['email'];
    this.model.password = this.form.value['password'];
    this._accountService
      .register(this.model)
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe(
        (result: RegisterOutput) => {
          if (!result.canLogin) {
            this.notify.success('Successfully Registered');
            this.navigate('/auth/sign-in');
            return;
          }

          //Autheticate
          this.saving = true;
          this._loginService.authenticateModel.userNameOrEmailAddress = this.model.emailAddress;
          this._loginService.authenticateModel.password = this.model.password;
          this._loginService.authenticate(() => {
            this.saving = false;
          });
        },
        (error: any) => {
          var content = '';
          try {
            content = JSON.parse(error?.response).error.message;
          } catch {
            content = error.message;
          }
          abp.event.trigger('showModal', {
            title: 'Error on Sign Up',
            content: content,
            buttonText: 'OK',
            buttonTextSecondary: undefined,
            onPositive: () => {},
            onNegative: () => {},
          });
        },
      );
  }

  async googleSignIn() {
    const googleUser = (await Plugins?.GoogleAuth.signIn()) as any;
    this._loginService.mobileGoogleLogin(JSON.stringify(googleUser));
  }

  appleSignIn() {
    SignInWithApple.authorize()
      .then((response: any) => {
        this._loginService.mobileAppleLogin(JSON.stringify(response));
      })
      .catch((response: any) => {
        console.error(response);
      });
  }

}
