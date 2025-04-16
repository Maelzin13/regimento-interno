import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-descricao-modal',
  templateUrl: './descricao-modal.component.html',
  styleUrls: ['./descricao-modal.component.scss'],
})
export class DescricaoModalComponent {
  @Input() titulo: string = '';
  @Input() descricao: string = '';

  constructor(private modalCtrl: ModalController) {}

  fechar() {
    this.modalCtrl.dismiss();
  }
}
