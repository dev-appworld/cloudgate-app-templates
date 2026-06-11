import { CommonModule } from '@angular/common';

import { NgModule } from '@angular/core';

import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';

import { FormsModule } from '@angular/forms';

import { LocaleMappingService } from './shared/locale-mapping.service';

import { PasswordModule } from 'primeng/password';

import { UtilsModule } from 'src/shared/utils/utils.module';

import { ModalModule } from 'ngx-bootstrap/modal';



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

    PasswordModule,

  ],

  declarations: [],

  exports: [],

  providers: [],

})

export class SharedModule {}

