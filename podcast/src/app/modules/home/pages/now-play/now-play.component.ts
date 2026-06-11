import { Component, Injector, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';

@Component({
  selector: 'app-now-play',
  templateUrl: './now-play.component.html',
  standalone: true,
  imports: [RouterOutlet],
})
export class NowPlayComponent extends AppComponentBase implements OnInit {
  testResult: string = '';

  constructor(injector: Injector) {
    super(injector);
  }

  ngOnInit(): void {
    this.setPageName('Now Play');
    this.setPageAction('/home');
    initFlowbite();
  }
}
