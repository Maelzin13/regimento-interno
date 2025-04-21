import { Component, OnInit } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { DashboardData } from 'src/app/models/dashboard.model';
import { DashboardService } from 'src/app/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  data: DashboardData | null = null;

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.dashboardService.getDashboardData().then(async (data) => {
      this.data = await data;
    });
  }

  async doRefresh(event: any) {
    try {
      const data = await this.dashboardService.getDashboardData();
      this.data = data;

      // delay de 1s para UX suave
      setTimeout(() => {
        event.target.complete();
        this.showSuccessToast();
      }, 1000);
    } catch (error) {
      console.error('Erro ao atualizar dashboard', error);
      event.target.complete();
    }
  }

  async showSuccessToast() {
    const toast = await this.toastController.create({
      message: 'Dados atualizados com sucesso!',
      duration: 2000,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  async fecharModal() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
