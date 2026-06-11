import { AbpHttpInterceptor, RefreshTokenService, AbpHttpConfigurationService } from 'abp-ng2-module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { CloudgateAuthService } from 'src/app/shared/auth/cloudgate-auth.service';
import { ZeroTemplateHttpConfigurationService } from './zero-template-http-configuration.service';

@NgModule({
  providers: [
    { provide: RefreshTokenService, useClass: CloudgateAuthService },
    { provide: AbpHttpConfigurationService, useClass: ZeroTemplateHttpConfigurationService },
    { provide: HTTP_INTERCEPTORS, useClass: AbpHttpInterceptor, multi: true },
  ],
})
export class ServiceProxyModule {}
