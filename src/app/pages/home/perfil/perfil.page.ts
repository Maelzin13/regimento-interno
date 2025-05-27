import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';
import { UserEditPage } from '../../user-edit/user-edit.page';
import { ModalController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage implements OnInit {
  user: UserModel | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
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

  async showToast(message: string = 'Perfil atualizado com sucesso!', color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
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

  private isGoogleUser(): boolean {
    return this.user?.provider === 'google';
  }

  async deleteAccount() {
    const confirmAlert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Confirmar',
          role: 'destructive',
          handler: async () => {
            if (this.isGoogleUser()) {
              await this.deleteGoogleAccount();
            } else {
              await this.deleteTraditionalAccount();
            }
          }
        }
      ]
    });

    await confirmAlert.present();
  }

  private async deleteGoogleAccount() {
    const loading = await this.loadingController.create({
      message: 'Excluindo conta...'
    });
    await loading.present();

    try {
      await this.userService.deleteAccount();
      await this.authService.logout();
      await loading.dismiss();
      await this.showToast('Conta excluída com sucesso!', 'success');
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error.message, 'danger');
    }
  }

  private async deleteTraditionalAccount() {
    const passwordAlert = await this.alertController.create({
      header: 'Digite sua Senha',
      message: 'Para confirmar a exclusão da sua conta, por favor digite sua senha:',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Sua senha'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Excluir Conta',
          role: 'destructive',
          handler: async (data: any) => {
            if (!data.password) {
              this.showToast('A senha é obrigatória', 'danger');
              return false;
            }
            
            const loading = await this.loadingController.create({
              message: 'Excluindo conta...'
            });
            await loading.present();

            try {
              await this.userService.deleteAccount(data.password);
              await this.authService.logout();
              await loading.dismiss();
              await this.showToast('Conta excluída com sucesso!', 'success');
              this.router.navigate(['/login'], { replaceUrl: true });
              return true;
            } catch (error: any) {
              await loading.dismiss();
              await this.showToast(error.message, 'danger');
              return false;
            }
          }
        }
      ]
    });

    await passwordAlert.present();
  }
}
