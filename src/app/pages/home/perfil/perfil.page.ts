import { ModalController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { UserEditPage } from '../../user-edit/user-edit.page';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage implements OnInit {
  user: UserModel | null = null;

  constructor(
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.loadUser();
  }

  async loadUser() {
    try {
      const userData = await this.authService.fetchProfile();
      this.user = userData;
    } catch (error) {
      console.error(error);
    }
  }
  async editProfile(id: number) {
    const modal = await this.modalController.create({
      component: UserEditPage,
      componentProps: { id },
    });
    modal.present();
    modal.onDidDismiss().then(async () => {
      await this.loadUser();
    });
  }

  subscribe() {
    window.open(`${environment.baseUrl}/login`, '_blank');
  }
}
