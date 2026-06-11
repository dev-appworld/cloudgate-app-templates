import { Component, Injector, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { AppConsts } from 'src/app/shared/AppConsts';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { ProfileServiceProxy } from 'src/shared/service-proxies/service-proxies';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  standalone: true,
  imports: [RouterOutlet, AngularSvgIconModule],
})
export class ProfileComponent extends AppComponentBase implements OnInit {
  profilePicture = AppConsts.appBaseUrl + '/assets/avatars/avt-01.jpg';

  constructor(injector: Injector, private _profileService: ProfileServiceProxy) {
    super(injector);
  }

  ngOnInit(): void {
    this.setPageName('Profile');
    this.setPageAction('Menu');
  }

}
