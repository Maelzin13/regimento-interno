import { Component, OnInit } from '@angular/core';
import { PlansService } from 'src/app/services/plans.service';
import { environment } from 'src/environments/environment';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-plans',
  templateUrl: './plans.page.html',
  styleUrls: ['./plans.page.scss'],
})
export class PlansPage implements OnInit {
  planos: any[] = [];
  isLoading = true;

  constructor(
    private plansService: PlansService,
    private navCtrl: NavController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadPlans();
  }

  async loadPlans() {
    this.isLoading = true;
    try {
      const response: any = await this.plansService.getPlans();
      this.planos = response.planos;
    } catch (error) {
      console.error('Erro ao carregar planos', error);
    } finally {
      this.isLoading = false;
    }
  }

  async doRefresh(event: any) {
    try {
      await this.loadPlans();
      this.showSuccessToast();
    } catch (e) {
      console.error(e);
    } finally {
      event.target.complete();
    }
  }

  async showSuccessToast() {
    const toast = await this.toastController.create({
      message: 'Planos atualizados com sucesso!',
      duration: 2000,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  subscribe() {
    window.open(`${environment.baseUrl}/login`, '_blank');
  }

  roolBack() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
