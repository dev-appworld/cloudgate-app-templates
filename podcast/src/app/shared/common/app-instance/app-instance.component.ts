import { Component, Injector, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppComponentBase } from '../app-component-base';
import { LocalService } from '../../session/local-storage.service';

@Component({
  selector: 'app-app-instance',
  templateUrl: './app-instance.component.html',
  styleUrls: ['./app-instance.component.css'],
})
export class AppInstanceComponent extends AppComponentBase implements OnInit {
  tenantId: number | undefined;

  constructor(injector: Injector, private activatedRoute: ActivatedRoute, private _router: Router) {
    super(injector);
  }

  ngOnInit(): void {
    this.tenantId = +(this.activatedRoute.snapshot.paramMap.get('id') ?? '');
    if (this.tenantId) {
      this.localStore.clearData();
      abp.multiTenancy.setTenantIdCookie(this.tenantId);
    }
    this._router.navigate(['auth/sign-in']);
  }
}
