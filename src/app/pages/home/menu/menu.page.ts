import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  user: UserModel | null = null;

  constructor(
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
  }

  async logout() {
    const loading = await this.loadingController.create({
      message: 'Saindo...',
      spinner: 'circular'
    });
    
    try {
      await loading.present();
      await this.authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao fazer logout. Tente novamente.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}
