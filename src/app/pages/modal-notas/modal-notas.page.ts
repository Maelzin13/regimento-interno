import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-modal-notas',
  templateUrl: './modal-notas.page.html',
  styleUrls: ['./modal-notas.page.scss'],
})
export class ModalNotasPage {
  @Input() content!: string;
  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }
}
