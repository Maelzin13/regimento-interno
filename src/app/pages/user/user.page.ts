import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { LoadingController, NavController } from '@ionic/angular';
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
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    this.loading = true;

    const loading = await this.loadingController.create({
      message: 'Carregando...',
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

  async fecharModal() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
