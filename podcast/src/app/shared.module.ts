import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ServiceProxyModule } from 'src/shared/service-proxies/service-proxy.module';
import { LocaleMappingService } from './shared/locale-mapping.service';
import { OAuthModule } from 'angular-oauth2-oidc';
import { PasswordModule } from 'primeng/password';
import { UtilsModule } from 'src/shared/utils/utils.module';
import { ModalModule } from 'ngx-bootstrap/modal';
import { environment } from 'src/environments/environment';
import { API_BASE_URL } from 'src/shared/service-proxies/service-proxies';
import { getRemoteServiceBaseUrl } from 'src/root.module';

export function getRecaptchaLanguage(): string {
  return new LocaleMappingService().map('recaptcha', abp.localization.currentLanguage.name);
}

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    HttpClientJsonpModule,
    ModalModule.forRoot(),
    UtilsModule,
    ServiceProxyModule,
    OAuthModule.forRoot(),
    PasswordModule,
  ],
  declarations: [],
  exports: [],
  providers: [{ provide: API_BASE_URL, useFactory: getRemoteServiceBaseUrl }],
})
export class SharedModule {}
