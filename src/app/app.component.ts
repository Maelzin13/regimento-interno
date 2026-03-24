import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Component, NgZone } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ConfigService } from './services/config.service';
import { Platform, ToastController } from '@ionic/angular';
import { NetworkService } from './services/network.service';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  private wasOnline: boolean | null = null;

  constructor(
    private zone: NgZone,
    private router: Router,
    private platform: Platform,
    private configService: ConfigService,
    private networkService: NetworkService,
    private toastController: ToastController,
  ) {
    this.initializeApp();
    this.platform.ready().then(async () => {
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#00000000' });
        await StatusBar.setStyle({ style: Style.Light });
      }
    });
    this.networkService.isOnline$.subscribe((isOnline) => {
      if (this.wasOnline !== null && this.wasOnline !== isOnline) {
        if (!isOnline) {
          this.showOfflineToast();
        }
      }
      this.wasOnline = isOnline;
    });
  }

  async initializeApp() {
    // Validar configuração primeiro
    this.configService.logConfigStatus();
    
    if (Capacitor.getPlatform() === 'android') {
      try {
        if (FirebaseAuthentication) {
          FirebaseAuthentication.addListener('authStateChange', (change) => {
          });
          // Não inicializar getCurrentUser aqui para evitar que o One Tap seja iniciado automaticamente
          // O erro "Developer console is not set up correctly" ocorre quando o One Tap tenta inicializar
          // const result = await FirebaseAuthentication.getCurrentUser();
        } 
      } catch (error: any) {
        // Ignorar erros relacionados ao One Tap durante a inicialização
        if (error?.message?.includes('one tap') || error?.message?.includes('Developer console')) {
          console.warn('⚠️ Google One Tap não configurado - será usado login manual:', error.message);
        } else {
          console.error('❌ Erro ao inicializar Firebase Authentication:', error);
        }
      }
    }

    // Aguardar um tempo para mostrar o splash screen
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Esconder o splash screen após a inicialização
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.error('❌ Erro ao esconder splash screen:', error);
    }
  }

  async showOfflineToast() {
    const toast = await this.toastController.create({
      message: 'Sem conexão com a internet.',
      duration: 3000,
      color: 'danger',
      position: 'middle',
    });
    await toast.present();
  }
}
