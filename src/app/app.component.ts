import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ConfigService } from './services/config.service';
import { Platform, ToastController } from '@ionic/angular';
import { NetworkService } from './services/network.service';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  private wasOnline: boolean | null = null;

  constructor(
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
          // Configurar listeners para mudanças de estado de autenticação
          FirebaseAuthentication.addListener('authStateChange', (change) => {
          });
          // Verificar se há usuário logado
          const result = await FirebaseAuthentication.getCurrentUser();
          
        } 
      } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Authentication:', error);
      }
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
