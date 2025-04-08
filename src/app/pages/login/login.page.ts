import config from 'capacitor.config';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  nameApp: any;
  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    const loading = await this.presentLoading('Verificando sessão...');
    try {
      this.nameApp = config.appName;

      const token = this.authService.getAuthToken();
      if (token) {
        const user = await this.authService.fetchProfile();
        localStorage.setItem('authUser', JSON.stringify(user));
        this.authService.userChanged.next(user);
        await loading.dismiss();
        this.router.navigate(['/home']);
      } else {
        await loading.dismiss();
      }
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast('Erro ao buscar sessão: ' + error.message);
    }
  }

  async login() {
    const loading = await this.presentLoading('Entrando...');
    try {
      const token = await this.authService.login(this.email, this.password);
      this.authService.saveAuthToken(token);

      const userProfile = await this.authService.fetchProfile();
      localStorage.setItem('authUser', JSON.stringify(userProfile));
      this.authService.userChanged.next(userProfile);

      await loading.dismiss();
      this.router.navigate(['/home']);
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast(error.message);
    }
  }

  async loginWithGoogle() {
    const loading = await this.presentLoading('Conectando com Google...');
    try {
      const response = await this.authService.googleLogin();

      if (response && response.user && response.token) {
        await loading.dismiss();
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        await loading.dismiss();
        this.presentToast('Login com Google falhou.');
      }
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast('Erro no login com Google: ' + error.message);
    }
  }

  async loginWithFacebook() {
    const loading = await this.presentLoading('Conectando com Facebook...');
    try {
      const response = await this.authService.facebookLogin();

      if (response && response.user && response.token) {
        await loading.dismiss();
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        await loading.dismiss();
        this.presentToast('Login com Facebook falhou.');
      }
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast('Erro no login com Facebook.');
    }
  }

  async presentLoading(message: string = 'Carregando...') {
    const loading = await this.loadingController.create({
      message,
      spinner: 'crescent',
      duration: 10000,
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
