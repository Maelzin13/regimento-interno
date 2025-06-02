import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ModalController, NavController } from '@ionic/angular';
import { QuestoesOremModel } from 'src/app/models/questoesOrem.model';
import { QuestoesOrdemService } from 'src/app/services/questoes-ordem.service';
import { EditOredemModalPage } from './edit-oredem-modal/edit-oredem-modal.page';
import { NovaOremModalPage } from './nova-orem-modal/nova-orem-modal.page';

@Component({
  selector: 'app-questao-ordem-nova',
  templateUrl: './questao-ordem-nova.page.html',
  styleUrls: ['./questao-ordem-nova.page.scss'],
})
export class QuestaoOrdemNovaPage implements OnInit {
  listQuestoes: QuestoesOremModel[] = [];
  questao: QuestoesOremModel = new QuestoesOremModel();

  constructor(
    private navCtrl: NavController,
    private modalController: ModalController,
    private questoesOrdemService: QuestoesOrdemService,
  ) {}

  ngOnInit() {
    this.questoesOrdemService.getAllQuestoesOrdem().then((questoes: any) => {
      this.listQuestoes = questoes.data;
    });
  }

  adicionar() {
    this.modalController.create({
      component: NovaOremModalPage  ,
      mode: 'ios',
    }).then((modal) => {
      modal.present();
      modal.onDidDismiss().then(async () => {
        await this.questoesOrdemService.getAllQuestoesOrdem().then((questoes: any) => {
          this.listQuestoes = questoes.data;
        });
      });
    });
  }

  editar(id: number) {
    this.questoesOrdemService.getQuestoesOrdemById(id).then((questao: any) => {
      this.questoesOrdemService.questao  = questao.data;
      this.modalController.create({
        component: EditOredemModalPage,
      }).then((modal) => {
        modal.present();
        modal.onDidDismiss().then(async () => {
          await this.questoesOrdemService.getAllQuestoesOrdem().then((questoes: any) => {
            this.listQuestoes = questoes.data;
          });
        });
      });
    });
  }

  excluir(id: number) {
    this.questoesOrdemService.deleteQuestoesOrdem(id).then(() => {
      this.listQuestoes = this.listQuestoes.filter((questao: any) => questao.id !== id);
    });
  }

  roolBack() {
    this.navCtrl.navigateRoot(['/home/book']);
  }
}
