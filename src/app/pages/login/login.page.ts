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

  async socialLogin(provider: 'google' | 'facebook') {
    const loading = await this.presentLoading(
      `Conectando com ${provider === 'google' ? 'Google' : 'Facebook'}...`
    );

    try {
      const response =
        provider === 'google'
          ? await this.authService.googleLogin()
          : await this.authService.facebookLogin();

      if (response?.user && response?.token) {
        this.authService.saveAuthToken(response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        this.authService.userChanged.next(response.user);

        await loading.dismiss();
        this.router.navigate(['/home']);
      } else {
        throw new Error(`Login com ${provider} falhou.`);
      }
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast(error.message || `Erro ao conectar com ${provider}`);
    }
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
