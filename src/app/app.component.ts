import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { NetworkService } from './services/network.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  private wasOnline: boolean | null = null;

  constructor(
    private toastController: ToastController,
    private networkService: NetworkService
  ) {
    this.networkService.isOnline$.subscribe((isOnline) => {
      if (this.wasOnline !== null && this.wasOnline !== isOnline) {
        if (!isOnline) {
          this.showOfflineToast();
        }
      }
      this.wasOnline = isOnline;
    });
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
