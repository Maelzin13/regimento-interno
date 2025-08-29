import { Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ToastController } from '@ionic/angular';
import { NetworkService } from './services/network.service';
import { ConfigService } from './services/config.service';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  private wasOnline: boolean | null = null;

  constructor(
    private toastController: ToastController,
    private networkService: NetworkService,
    private configService: ConfigService
  ) {
    this.initializeApp();
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
