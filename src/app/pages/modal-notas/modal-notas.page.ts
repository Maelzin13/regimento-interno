import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-modal-notas',
  templateUrl: './modal-notas.page.html',
  styleUrls: ['./modal-notas.page.scss'],
})
export class ModalNotasPage implements OnInit {

 constructor(private modalController: ModalController) {}

  ngOnInit() {
  }

   dismiss() {
    this.modalController.dismiss();
  }

}
