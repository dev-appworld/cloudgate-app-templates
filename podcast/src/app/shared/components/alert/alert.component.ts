import { NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Modal } from 'flowbite';

@Component({
  selector: 'alertModal',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css'],
  standalone: true,
  imports: [NgIf, NgClass],
})
export class AlertModalComponent implements OnInit {
  modal: Modal | undefined;
  options: any = {
    closable: false,
  };
  frameReady: boolean = false;
  modalTemplate: any = {
    title: '',
    content: undefined,
    frameUrl: undefined,
    buttonText: '',
    buttonTextSecondary: '',
    danger: undefined,
    onPositive: () => {},
    onNegative: () => {},
  };

  constructor(private _sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    const infoModal = document.getElementById('infoModal');
    this.modal = new Modal(infoModal, this.options);
    abp.event.on(
      'showModal',
      ({ title, content, frameUrl, buttonText, buttonTextSecondary, danger, onPositive, onNegative }) => {
        this.modalTemplate = {
          title,
          content,
          frameUrl,
          buttonText,
          buttonTextSecondary,
          danger,
          onPositive,
          onNegative,
        };
        this.show();
      },
    );
    abp.event.on('hideModal', () => {
      this.hide();
    });
  }

  show(): void {
    this.modal?.toggle();
  }

  hide(): void {
    this.frameReady = false;
    this.modalTemplate = {};
    this.modal?.hide();
  }

  positiveAction() {
    if (this.modalTemplate?.onPositive) {
      this.modalTemplate?.onPositive();
    }
    this.hide();
  }

  negativeAction() {
    if (this.modalTemplate?.onNegative) {
      this.modalTemplate?.onNegative();
    }
    this.hide();
  }

  safeUrl(url: string) {
    return this._sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  frameLoad(event: any) {
    this.frameReady = true;
  }
}
