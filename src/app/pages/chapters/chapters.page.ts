import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { SearchPage } from '../search/search.page';
import { EditBookModalPage } from '../home/edit-book-modal/edit-book-modal.page';

@Component({
  selector: 'app-chapters',
  templateUrl: './chapters.page.html',
  styleUrls: ['./chapters.page.scss'],
})
export class ChaptersPage implements OnInit {
  capitulo: any;

  constructor(
    private router: Router,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.capitulo = history.state.capitulo || {};
    console.log('capitulo: ', this.capitulo);
  }

  navigateToArtigo(artigo: any) {
    this.router.navigate(['/articles', artigo.id], {
      state: { artigo },
    });
  }

  async abrirEditor(itemId: number, itemType: string) {
    const modal = await this.modalController.create({
      component: EditBookModalPage,
      componentProps: {
        itemId: itemId,
        itemType: itemType,
      },
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
