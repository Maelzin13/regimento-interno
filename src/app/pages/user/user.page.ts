import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { UserService } from 'src/app/services/user.service';
import { DetailedUserModel } from 'src/app/models/detailedUserModel';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
})
export class UserPage implements OnInit {
  users: DetailedUserModel[] = [];
  loading = false;
  errorMessage = '';

  constructor(
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
        DetailedUserModel.fromJSON(user)
      );
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Erro ao carregar a lista de usuários.';
    } finally {
      await loading.dismiss();
      this.loading = false;
    }
  }
}
