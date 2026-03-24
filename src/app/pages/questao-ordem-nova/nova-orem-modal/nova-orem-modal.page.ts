import {
  ModalController,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { QuestoesOrdemService } from 'src/app/services/questoes-ordem.service';
import { QuestoesOremModel } from 'src/app/models/questoesOrem.model';

@Component({
  standalone: false,
  selector: 'app-nova-orem-modal',
  templateUrl: './nova-orem-modal.page.html',
  styleUrls: ['./nova-orem-modal.page.scss'],
})
export class NovaOremModalPage implements OnInit {
  item: QuestoesOremModel = new QuestoesOremModel();

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private questoesOrdemService: QuestoesOrdemService,
  ) {}

  ngOnInit() {
    this.item = new QuestoesOremModel();
  }


  dismiss() {
    this.modalController.dismiss();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async salvarConteudo() {
    if (!this.item.titulo.trim()) {
      this.presentToast('O título não pode estar vazio.');
      return;
    }

    try {
      let data = {
        titulo: this.item.titulo,
        descricao: this.item.descricao,
      };
      
      await this.questoesOrdemService.createQuestoesOrdem(data);

      this.presentToast('Alterações salvas com sucesso.');
      this.dismiss();
    } catch (error) {
      this.presentToast('Erro ao salvar alterações.');
    }
  }
}
