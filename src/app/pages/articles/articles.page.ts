import { ModalPage } from '../modal/modal.page';
import { ModalController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { SearchPage } from '../search/search.page';

@Component({
  selector: 'app-articles',
  templateUrl: './articles.page.html',
  styleUrls: ['./articles.page.scss'],
})
export class ArticlesPage implements OnInit {
  artigo: any = null;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.artigo = history.state.artigo || {};
    console.log('artigos: ', this.artigo);
  }

  async openModal(content: string) {
    const modal = await this.modalController.create({
      component: ModalPage,
      componentProps: { content },
    });
    return await modal.present();
  }

  async search() {
    const modal = await this.modalController.create({
      component: SearchPage,
      // componentProps: ,
    });

    await modal.present();
  }
}
