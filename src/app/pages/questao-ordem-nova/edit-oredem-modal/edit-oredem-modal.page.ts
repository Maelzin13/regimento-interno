import {
  ModalController,
  ToastController,
  LoadingController,
} from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { QuestoesOrdemService } from 'src/app/services/questoes-ordem.service';
import { QuestoesOremModel } from 'src/app/models/questoesOrem.model';

@Component({
  selector: 'app-edit-oredem-modal',
  templateUrl: './edit-oredem-modal.page.html',
  styleUrls: ['./edit-oredem-modal.page.scss'],
})
export class EditOredemModalPage implements OnInit {
  item: QuestoesOremModel = new QuestoesOremModel();
  editorContent: string = '';
  isLoading: boolean = false;
  isEditingContent: boolean = false;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private questoesOrdemService: QuestoesOrdemService,
  ) {}

  ngOnInit() {
    this.loadItem();
  }

  async loadItem() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Carregando...',
    });
    await loading.present();

    try {
      this.item = this.questoesOrdemService.questao;

    } catch (error) {
      console.error('Erro ao carregar o item:', error);
      this.presentToast('Erro ao carregar o conteúdo.');
    } finally {
      loading.dismiss();
      this.isLoading = false;
    }
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
      
      await this.questoesOrdemService.updateQuestoesOrdem(this.item.id, data);

      this.presentToast('Alterações salvas com sucesso.');
      this.dismiss();
    } catch (error) {
      this.presentToast('Erro ao salvar alterações.');
    }
  }
}
