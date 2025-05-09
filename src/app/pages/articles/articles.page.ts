import { ModalPage } from '../modal/modal.page';
import { ModalController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';

@Component({
  selector: 'app-articles',
  templateUrl: './articles.page.html',
  styleUrls: ['./articles.page.scss'],
})
export class ArticlesPage implements OnInit {
  artigo: any = null;
  user: UserModel | null = null;
  constructor(
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
    this.artigo = history.state.artigo || {};
  }

  cleanHTML(content: string): string {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return doc.body.textContent || '';
  }

  async openModal(content: string) {
    const modal = await this.modalController.create({
      component: ModalPage,
      componentProps: { content },
    });
    return await modal.present();
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
}
