import { Component, Injector, OnInit, ViewChild } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { NgClass, NgIf } from '@angular/common';
import { UtilsModule } from 'src/shared/utils/utils.module';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { NgOtpInputModule } from 'ng-otp-input';
import { SaasType, SessionServiceProxy } from 'src/shared/service-proxies/service-proxies';
import { finalize } from 'rxjs';
import { ScanQRCodeComponent } from 'src/app/shared/components/scan-qrcode/scan-qrcode.component';
import { SlideContentComponent } from './slide-content/slide-content.component';
import { LocalService } from 'src/app/shared/session/local-storage.service';
import Swipe from 'swipejs';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
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
    NgOtpInputModule,
    ScanQRCodeComponent,
    SlideContentComponent,
  ],
})
export class OnboardingComponent extends AppComponentBase implements OnInit {
  @ViewChild('ngOtpInput', { static: false }) ngOtpInput: any;
  @ViewChild('scanQRCodeModal', { static: true }) scanQRCodeModal: ScanQRCodeComponent | undefined;

  otp: string = '';
  saving!: boolean;
  config = {
    allowNumbersOnly: true,
    length: 6,
    inputStyles: {
      width: '40px',
      height: '40px',
      color: '#000000',
    },
    disableAutoFocus: true,
  };

  constructor(
    injector: Injector,
    private _localStore: LocalService,
    private readonly _router: Router,
    private _sessionService: SessionServiceProxy,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    window.mySwipe = new Swipe(document.getElementById('slider')!);
    this.subscribeToEvent('app.show.scanQRCode', (callback: (qrcode: string) => void) => {
      this.scanQRCodeModal?.show(callback);
    });

    if (!window.config.BuildTenantId && this.appSession.isMobile) {
      var showDisclaimer = (this._localStore.getData('hide-disclaimer') == '' ? 'true' : 'false') == 'true';
      if (showDisclaimer) {
        this.showDisclaimer();
      }
    }
  }

  ngAfterViewInit(): void {
    if (!window.mySwipe) {
      window.mySwipe = new Swipe(document.getElementById('slider')!);
    }
  }

  sampleApp() {
    this._router.navigate([`/auth/app/${window.config.SampleAppTenantId}`]);
  }

  onOtpChange(otp: string) {
    this.otp = otp;
    if (this.otp.length == 6) {
      this.submit();
    }
  }

  setVal(val: string) {
    this.ngOtpInput.setValue(val);
  }

  submit() {
    this.saving = true;
    this._sessionService
      .getTenantIdByCommunityCode(this.otp, SaasType.LMS)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe((result) => {
        if (result > 0) {
          this._router.navigate([`/auth/app/${result}`]);
        } else {
          this.toastr.error('Invalid Code');
        }
      });
  }

  scanQR() {
    abp.event.trigger('app.show.scanQRCode', (code: any) => {
      this.setVal(code);
    });
  }

  next() {
    window.mySwipe.next();
  }

  prev() {
    window.mySwipe.prev();
  }

  showDisclaimer() {
    abp.event.trigger('showModal', {
      title: 'Test App',
      content: `
              <p class="text-center">
                This is a test app created to showcase how <strong>AppWorld SaaS</strong> apps work. <br/>
                Every <strong>App Owner</strong> will get their own app published with their custom <strong>icon</strong> and <strong>styling</strong>. <br/>
                Published Apps connect <strong><span class='text-primary'>automatically</span></strong> to their <strong><span class='text-primary'>App Owner's Community</span></strong>.<br/><br/>
                To learn more about us or how to create your own app visit https://appworldsa.com
              </p>
              `,
      buttonText: 'Go to Website',
      buttonTextSecondary: 'Got it!',
      onPositive: () => {
        this._localStore.saveData('hide-disclaimer', 'false');
        this.website();
      },
      onNegative: () => {
        this._localStore.saveData('hide-disclaimer', 'false');
      },
    });
  }
}
