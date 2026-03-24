import config from 'capacitor.config';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { StorageService } from 'src/app/services/storage.service';
import { ToastController, LoadingController, NavController } from '@ionic/angular';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  nameApp: any;
  email: string = '';
  password: string = '';
  showPassword = false;

  // ✅ só habilita social login em plataformas nativas
  readonly isNative = Capacitor.getPlatform() !== 'web';
  // ✅ Apple Sign In apenas no iOS
  readonly isIOS = Capacitor.getPlatform() === 'ios';

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
        const profileData = await this.authService.fetchProfile();
        await this.storage.set('authUser', profileData.user);
        this.authService.userChanged.next(profileData.user);
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

      const profileData = await this.authService.fetchProfile();
      await this.storage.set('authUser', profileData.user);
      this.authService.userChanged.next(profileData.user);

      await loading.dismiss();
      this.email = '';
      this.password = '';
      this.router.navigate(['/home']);
    } catch (error: any) {
      await loading.dismiss();
      this.presentToast(error.message);
    }
  }

  async socialLogin(provider: 'google' | 'apple') {
    if (!this.isNative) {
      // ✅ Web desabilitado
      this.presentToast(`Login com ${provider} disponível apenas em iOS/Android.`);
      return;
    }

    // ✅ Apple Sign In apenas no iOS
    if (provider === 'apple' && !this.isIOS) {
      this.presentToast('Apple Sign In disponível apenas em iOS.');
      return;
    }

    const loading = await this.presentLoading(`Conectando com ${provider}...`);
    try {
      let response: any;
      
      if (provider === 'google') {
        // ✅ googleLogin usa somente plugins nativos (Android: @capacitor-firebase/authentication; iOS: Generic OAuth2)
        response = await this.authService.googleLogin();
      } else if (provider === 'apple') {
        // ✅ appleLogin usa @capacitor-community/apple-sign-in (apenas iOS)
        response = await this.authService.appleLogin();
      }

      if (response?.user && response?.token) {
        // socialLogin já salva token/usuário internamente
        await loading.dismiss();
        this.router.navigate(['/home']);
      } else {
        throw new Error(`Login com ${provider} falhou - resposta inválida.`);
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error(`Erro no login ${provider}:`, error);
      
      // Tratamento específico de erros
      let errorMessage = error.message || `Erro ao conectar com ${provider}`;
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Login demorou muito para responder. Tente novamente.';
      } else if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        errorMessage = 'Login foi cancelado pelo usuário.';
      } else if (error.message?.includes('já está em andamento')) {
        errorMessage = 'Login já está em andamento. Aguarde...';
      } else if (error.message?.includes('conectividade')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      }
      
      this.presentToast(errorMessage);
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
