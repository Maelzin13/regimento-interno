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
    private toastController: ToastController,
    private networkService: NetworkService,
    private configService: ConfigService,
  ) {
    this.initializeApp();
    this.platform.ready().then(async () => {
      if (Capacitor.isNativePlatform()) {
        // NÃO sobrepor a WebView (evita passar por cima do toolbar)
        await StatusBar.setOverlaysWebView({ overlay: false });
  
        // Ajuste cor para combinar com o seu toolbar
        await StatusBar.setBackgroundColor({ color: '#00000000' });
  
        // Ícones da status bar (LIGHT = ícones claros; DARK = ícones escuros)
        await StatusBar.setStyle({ style: Style.Light }); // se o fundo for escuro
        // await StatusBar.setStyle({ style: Style.DARK }); // se o fundo for claro
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
    
    // Inicializar plugin do Firebase Authentication no Android
    if (Capacitor.getPlatform() === 'android') {
      try {
        console.log('🔧 Inicializando Firebase Authentication para Android...');
        
        // Verificar se o plugin está disponível
        if (FirebaseAuthentication) {
          console.log('✅ Plugin Firebase Authentication disponível');
          
          // Configurar listeners para mudanças de estado de autenticação
          FirebaseAuthentication.addListener('authStateChange', (change) => {
            console.log('🔄 Auth state changed:', change);
          });
          
          // Verificar se há usuário logado
          const result = await FirebaseAuthentication.getCurrentUser();
          console.log('👤 Usuário atual:', result);
          
        } else {
          console.error('❌ Plugin Firebase Authentication não disponível');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Authentication:', error);
      }
    } else {
      console.log('📱 Plataforma não é Android, pulando inicialização do plugin nativo');
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
