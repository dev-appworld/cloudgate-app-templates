import { afterNextRender, Component, Injector, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { AppConsts } from 'src/app/shared/AppConsts';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgFor, NgIf } from '@angular/common';
import { CategoryGridItemComponent } from './components/category-grid-item/category-grid-item.component';
import { DoctorItemComponent } from './components/doctor-item/doctor-item.component';
import { MedicalWorkflowService } from 'src/app/shared/workflow/medical-workflow.service';
import { MedicalCatalog, MedicalDoctor } from 'src/app/shared/workflow/medical.models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [RouterOutlet, AngularSvgIconModule, CategoryGridItemComponent, DoctorItemComponent, NgIf, NgFor],
})
export class HomeComponent extends AppComponentBase implements OnInit {
  catalog: MedicalCatalog | null = null;
  loading = true;
  loadError = false;

  constructor(
    injector: Injector,
    private readonly medicalWorkflow: MedicalWorkflowService,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    AppConsts.pageName = 'Home';
    AppConsts.pageAction = 'Menu';
    initFlowbite();
    this.loadCatalog();
  }

  private loadCatalog(): void {
    this.medicalWorkflow.loadCatalog().then((catalog) => {
      this.catalog = catalog;
      this.loading = false;
      this.loadError = this.medicalWorkflow.getState() === 'error';
      if (!this.loadError && catalog.forYou.length > 0) {
        afterNextRender(() => initFlowbite(), { injector: this.injector });
      }
    });
  }

  trackById(_index: number, item: MedicalDoctor): string {
    return item.id;
  }
}
