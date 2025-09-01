import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
})
export class CadastroPage implements OnInit {
  nameApp: any;
  name: string = '';
  email: string = '';
  password: string = '';
  password_confirmation: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
  }


  async register() {
    if (!this.name || !this.email || !this.password || !this.password_confirmation) {
      this.presentToast('Preencha todos os campos.');
      return;
    }

    if (this.password !== this.password_confirmation) {
      this.presentToast('As senhas não coincidem.');
      return;
    }

    const loading = await this.presentLoading('Criando conta...');
    try {

      const userProfile = await this.authService.fetchProfile();
      localStorage.setItem('authUser', JSON.stringify(userProfile));
      this.authService.userChanged.next(userProfile);

      await loading.dismiss();
      this.resetForm();
      this.router.navigate(['/home']);
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast(error.message || 'Erro ao cadastrar usuário.');
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  resetForm() {
    this.name = '';
    this.email = '';
    this.password = '';
    this.password_confirmation = '';
  }

  async presentLoading(message: string = 'Carregando...') {
    const loading = await this.loadingController.create({
      message,
      spinner: 'bubbles',
      translucent: true,
      backdropDismiss: false,
    });
    await loading.present();
    return loading;
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'middle',
    });
    toast.present();
  }
}
