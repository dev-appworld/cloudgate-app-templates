import { Component, Injector, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AppConsts } from 'src/app/shared/AppConsts';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { FavouriteListItemComponent } from '../components/favourite-list-item/favourite-list-item.component';
import { initFlowbite } from 'flowbite';
import { WalletWorkflowService } from 'src/app/shared/workflow/wallet-workflow.service';
import { WalletCatalog, WalletCatalogItem } from 'src/app/shared/workflow/wallet-catalog.models';

@Component({
  selector: 'app-favourites',
  templateUrl: './favourites.component.html',
  standalone: true,
  imports: [RouterOutlet, FavouriteListItemComponent, NgIf, NgFor],
})
export class FavouritesComponent extends AppComponentBase implements OnInit {
  catalog: WalletCatalog | null = null;
  loading = true;
  loadError = false;

  constructor(
    injector: Injector,
    private readonly walletWorkflowService: WalletWorkflowService,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    AppConsts.pageName = 'Favourites';
    AppConsts.pageAction = 'Menu';
    initFlowbite();
    this.walletWorkflowService.loadCatalog().then((catalog) => {
      this.catalog = catalog;
      this.loading = false;
      this.loadError = this.walletWorkflowService.getState() === 'error';
    });
  }

  trackById(_index: number, item: WalletCatalogItem): string {
    return item.id;
  }
}

