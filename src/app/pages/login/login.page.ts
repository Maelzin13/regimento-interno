import config from 'capacitor.config';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { StorageService } from 'src/app/services/storage.service';
import { ToastController, LoadingController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  nameApp: any;
  email: string = '';
  password: string = '';

  // ✅ só habilita social login em plataformas nativas
  readonly isNative = Capacitor.getPlatform() !== 'web';

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private authService: AuthService,
    private storage: StorageService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    const loading = await this.presentLoading('Verificando sessão...');

    try {
      this.nameApp = config.appName;

      // Se não há token salvo, "zera" a sessão e segue
      if (!this.authService.getAuthToken()) {
        await this.storage.clear();
        sessionStorage.clear();
        this.authService.userChanged.next(null);
        await loading.dismiss();
        return;
      }

      // Valida token da API
      try {
        const user = await this.authService.fetchProfile();
        await this.storage.set('authUser', user);
        this.authService.userChanged.next(user);
        await loading.dismiss();
        this.router.navigate(['/home']);
      } catch (error) {
        // Token inválido → limpa e mantém na tela de login
        await this.storage.clear();
        sessionStorage.clear();
        this.authService.userChanged.next(null);
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
      // authService.login já salva o token internamente, não precisa chamar saveAuthToken

      const userProfile = await this.authService.fetchProfile();
      await this.storage.set('authUser', userProfile);
      this.authService.userChanged.next(userProfile);

      await loading.dismiss();
      this.email = '';
      this.password = '';
      this.router.navigate(['/home']);
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast(error.message);
    }
  }

  async socialLogin(provider: 'google') {
    if (!this.isNative) {
      // ✅ Web desabilitado
      this.presentToast('Login com Google disponível apenas em iOS/Android.');
      return;
    }

    const loading = await this.presentLoading(`Conectando com ${provider}...`);
    try {
      // ✅ googleLogin usa somente plugins nativos (Android: @capacitor-firebase/authentication; iOS: Generic OAuth2)
      const response = await this.authService.googleLogin();

      if (response?.user && response?.token) {
        // googleLogin já salva token/usuário internamente, mas se quiser manter:
        // this.authService.saveAuthToken(response.token);
        // localStorage.setItem('authUser', JSON.stringify(response.user));
        // this.authService.userChanged.next(response.user);

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

  async forgotPassword() {
    this.navCtrl.navigateRoot('/forgot-password');
  }

  goToCadastro() {
    this.navCtrl.navigateRoot('/cadastro');
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
