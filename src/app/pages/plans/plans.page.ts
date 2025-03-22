import { NavController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { PlansService } from 'src/app/services/plans.service';

@Component({
  selector: 'app-plans',
  templateUrl: './plans.page.html',
  styleUrls: ['./plans.page.scss'],
})
export class PlansPage implements OnInit {
  planos: any[] = [];
  planoAtivo: any = null;
  assinaturaAtiva: any = null;

  constructor(
    private navCtrl: NavController,
    private plansService: PlansService
  ) {}

  ngOnInit() {
    this.loadPlans();
  }

  async loadPlans() {
    try {
      const response: any = await this.plansService.getPlans();
      this.planos = response.planos;
      this.planoAtivo = response.planoAtivo;
      this.assinaturaAtiva = response.assinaturaAtiva;
    } catch (error) {
      console.error('Erro ao carregar planos', error);
    }
  }

  subscribe() {
    window.open(`${environment.baseUrl}/login`, '_blank');
  }

  async roolBack() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
