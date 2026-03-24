import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';
import { AuthService } from 'src/app/services/auth.service';
import { ModalController, NavParams, AlertController, ToastController } from '@ionic/angular';
import { DetailedUserModel } from 'src/app/models/detailedUserModel';

@Component({
  standalone: false,
  selector: 'app-user-edit',
  templateUrl: './user-edit.page.html',
  styleUrls: ['./user-edit.page.scss'],
})
export class UserEditPage implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  user: DetailedUserModel | null = null;

  // Centraliza a regra: travar edição se provider === 'google' ou 'apple'
  get isGoogle(): boolean {
    return (this.user?.provider || '').toLowerCase() === 'google';
  }

  get isApple(): boolean {
    const provider = (this.user?.provider || '').toLowerCase();
    return provider === 'apple' || provider === 'apple_native' || provider === 'apple_simple';
  }

  get canEdit(): boolean {
    return !this.isGoogle && !this.isApple;
  }

  constructor(
    private navParams: NavParams,
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    public modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController
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

    // Defesa extra: mesmo se alguém reabilitar o botão, o método bloqueia.
    if (this.isGoogle) {
      this.errorMessage = 'Esta conta é do Google. Edições devem ser feitas na sua Conta Google.';
      return;
    }

    if (this.isApple) {
      this.errorMessage = 'Esta conta é do Apple. Edições devem ser feitas na sua Conta Apple.';
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      await this.userService.updateUser(this.user);
      this.successMessage = 'Usuário atualizado com sucesso!';
      setTimeout(() => this.fecharModal(), 1000);
    } catch (error) {
      console.error(error);
      this.errorMessage = 'Erro ao salvar as alterações.';
    } finally {
      this.loading = false;
    }
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Excluir Conta',
      message: this.isApple 
        ? '⚠️ ATENÇÃO: Esta é uma conta Apple. A exclusão removerá todos os dados permanentemente e você precisará criar uma nova conta Apple para acessar novamente.'
        : 'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            await this.confirmDeleteAccount();
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmDeleteAccount() {
    const loading = await this.toastController.create({
      message: 'Excluindo conta...',
      duration: 0,
      position: 'middle'
    });
    await loading.present();

    try {
      await this.userService.deleteAccount();
      
      const successToast = await this.toastController.create({
        message: 'Conta excluída com sucesso!',
        duration: 3000,
        color: 'success',
        position: 'middle'
      });
      await successToast.present();

      // O logout já foi feito no deleteAccount do UserService
    } catch (error: any) {
      console.error('Erro ao excluir conta:', error);
      
      const errorToast = await this.toastController.create({
        message: error.message || 'Erro ao excluir conta. Tente novamente.',
        duration: 3000,
        color: 'danger',
        position: 'middle'
      });
      await errorToast.present();
    } finally {
      await loading.dismiss();
    }
  }

  async fecharModal() {
    this.modalCtrl.dismiss();
  }
}
