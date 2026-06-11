import { Component, Injector, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { AppComponentBase } from 'src/app/shared/common/app-component-base';
import { PodcastWorkflowService } from 'src/app/shared/workflow/podcast-workflow.service';
import { PodcastItem } from 'src/app/shared/workflow/podcast.models';

@Component({
  selector: 'app-now-play',
  templateUrl: './now-play.component.html',
  standalone: true,
  imports: [RouterOutlet, NgIf, NgFor],
})
export class NowPlayComponent extends AppComponentBase implements OnInit {
  item: PodcastItem | undefined;
  loading = true;
  loadError = false;

  constructor(
    injector: Injector,
    private readonly route: ActivatedRoute,
    private readonly podcastWorkflow: PodcastWorkflowService,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.setPageName('Now Play');
    this.setPageAction('/home');
    const id = this.route.snapshot.paramMap.get('id');
    this.podcastWorkflow.loadCatalog().then(() => {
      this.item = this.podcastWorkflow.getById(id) ?? this.podcastWorkflow.getById('chocolate-dreams');
      this.loading = false;
      this.loadError = !this.item && this.podcastWorkflow.getState() === 'error';
      initFlowbite();
    });
  }

  get progressPercent(): number {
    if (!this.item?.durationSeconds || !this.item.progressSeconds) return 50;
    return Math.min(100, Math.round((this.item.progressSeconds / this.item.durationSeconds) * 100));
  }

  formatTime(seconds?: number): string {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
