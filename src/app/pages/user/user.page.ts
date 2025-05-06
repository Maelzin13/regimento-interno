import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { DetailedUserModel } from 'src/app/models/detailedUserModel';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
})
export class UserPage implements OnInit {
  loading = false;
  errorMessage = '';
  users: DetailedUserModel[] = [];

  constructor(
    private navCtrl: NavController,
    private userService: UserService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;

    const loading = await this.loadingController.create({
      message: 'Carregando usuários...',
    });
    await loading.present();

    try {
      const userData = await this.userService.getAllUsers();
      this.users = userData.map((user: any) =>
        Object.assign(new DetailedUserModel(), user)
      );
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Erro ao carregar a lista de usuários.';
    } finally {
      await loading.dismiss();
      this.loading = false;
    }
  }

  async doRefresh(event: any) {
    try {
      await this.loadUsers();
      this.showSuccessToast();
    } catch (e) {
      console.error(e);
    } finally {
      event.target.complete();
    }
  }

  async showSuccessToast() {
    const toast = await this.toastController.create({
      message: 'Lista de usuários atualizada com sucesso!',
      duration: 2000,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  async fecharModal() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
