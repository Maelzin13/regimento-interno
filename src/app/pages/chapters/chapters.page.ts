import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';

@Component({
  selector: 'app-chapters',
  templateUrl: './chapters.page.html',
  styleUrls: ['./chapters.page.scss'],
})
export class ChaptersPage implements OnInit {
  capitulo: any;
  user: UserModel | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
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
}
