import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { ModalController, NavParams } from '@ionic/angular';
import { DetailedUserModel } from 'src/app/models/detailedUserModel';

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.page.html',
  styleUrls: ['./user-edit.page.scss'],
})
export class UserEditPage implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  user: DetailedUserModel | null = null;

  constructor(
    private navParams: NavParams,
    private route: ActivatedRoute,
    private userService: UserService,
    public modalCtrl: ModalController
  ) {}

  async ngOnInit() {
    this.loading = true;
    const userId = this.route.snapshot.params['id'] || this.navParams.get('id');

    try {
      const userData = await this.userService.getUsersById(userId);
      this.user = userData;
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Erro ao carregar informações do usuário.';
    } finally {
      this.loading = false;
    }
  }

  async saveChanges() {
    if (!this.user) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';
    try {
      await this.userService.updateUser(this.user);
      this.successMessage = 'Usuário atualizado com sucesso!';
      setTimeout(() => {
        this.fecharModal();
      }, 1000);
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Erro ao salvar as alterações.';
    } finally {
      this.loading = false;
    }
  }

  async fecharModal() {
    this.modalCtrl.dismiss();
  }
}
