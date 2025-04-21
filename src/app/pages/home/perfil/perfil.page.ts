import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { UserEditPage } from '../../user-edit/user-edit.page';
import { ModalController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage implements OnInit {
  user: UserModel | null = null;

  constructor(
    private authService: AuthService,
    private modalController: ModalController,
    private toastController: ToastController
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

  async doRefresh(event: any) {
    try {
      await this.loadUser();
      this.showToast();
    } catch (e) {
      console.error(e);
    } finally {
      event.target.complete();
    }
  }

  async showToast() {
    const toast = await this.toastController.create({
      message: 'Perfil atualizado com sucesso!',
      duration: 2000,
      color: 'success',
      position: 'bottom',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  async editProfile(id: number) {
    const modal = await this.modalController.create({
      component: UserEditPage,
      componentProps: { id },
    });
    await modal.present();
    modal.onDidDismiss().then(async () => {
      await this.loadUser();
    });
  }

  subscribe() {
    window.open(`${environment.baseUrl}/login`, '_blank');
  }
}
