import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Component, NgZone } from '@angular/core';
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
            console.log('🔄 Mudança de estado de autenticação:', change);
          });
          const result = await FirebaseAuthentication.getCurrentUser();
          console.log('🔄 Usuário autenticado:', result);
        } 
      } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Authentication:', error);
      }
    }

    // Removido: processamento de deeplinks do Stripe
    // 
    // Com a evolução do backend, não precisamos mais processar deeplinks.
    // O fluxo agora é mais simples:
    // 1. Usuário clica em assinar -> abre navegador web
    // 2. Usuário completa pagamento no Stripe
    // 3. Stripe envia webhook para o backend automaticamente
    // 4. Backend processa e atualiza usuário
    // 5. Frontend recebe atualização via eventos de mudança de status
    //
    // App.addListener('appUrlOpen', ...) - REMOVIDO
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
