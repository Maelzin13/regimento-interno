import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  standalone: false,
  selector: 'app-modal',
  templateUrl: './modal.page.html',
  styleUrls: ['./modal.page.scss'],
})
export class ModalPage {
  @Input() content!: string;
  @Input() title: string = 'Detalhes';

  constructor(
    private modalController: ModalController,
    private sanitizer: DomSanitizer
  ) {}

  get safeContent(): SafeHtml {
    if (!this.content) return this.sanitizer.bypassSecurityTrustHtml('');
    return this.sanitizer.bypassSecurityTrustHtml(this.content);
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
