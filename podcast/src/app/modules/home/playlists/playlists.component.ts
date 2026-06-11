import { Component, Injector, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppConsts } from 'src/app/shared/AppConsts';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { PodcastListItemComponent } from '../components/podcast-list-item/podcast-list-item.component';
import { initFlowbite } from 'flowbite';
import { DemoPodcastItemListDto, DemoPodcastServiceProxy } from 'src/shared/service-proxies/service-proxies';
import { finalize } from 'rxjs';
import { NgFor, NgIf } from '@angular/common';
import { LocalStorageService } from 'src/shared/utils/local-storage.service';

@Component({
  selector: 'app-playlists',
  templateUrl: './playlists.component.html',
  standalone: true,
  imports: [RouterOutlet, PodcastListItemComponent, NgIf, NgFor],
})
export class PlaylistsComponent extends AppComponentBase implements OnInit {
  loaded: boolean = false;
  items: any[] | undefined = [];

  constructor(
    injector: Injector,
    private _demoPodcastService: DemoPodcastServiceProxy,
    private _localStorageService: LocalStorageService,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    AppConsts.pageName = 'Playlists';
    AppConsts.pageAction = 'Menu';
    initFlowbite();
    // this.getItems();
  }

  getItems() {
    this._demoPodcastService
      .all('', '', 100, 0)
      .pipe(finalize(() => (this.loaded = true)))
      .subscribe((result) => {
        this.items = result.items;
        this.setImageUrl(this.items);
      });
  }

  setImageUrl(items: DemoPodcastItemListDto[] | undefined): void {
    for (let i = 0; i < items!.length; i++) {
      let item = items![i];
      this._localStorageService.getItem(
        AppConsts.authorization.encrptedAuthTokenName,
        function (err: any, value: { token: string | number | boolean }) {
          if (!item.imageId) {
            item.imageId = '';
          }
          let imageUrl =
            AppConsts.remoteServiceBaseUrl +
            '/File/GetFileById?id=' +
            item.imageId +
            '&' +
            AppConsts.authorization.encrptedAuthTokenName +
            '=' +
            encodeURIComponent(value.token);
          (item as any).imageUrl = imageUrl;
        },
      );
    }
  }
}
