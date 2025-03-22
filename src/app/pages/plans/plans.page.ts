import { Component, OnInit } from '@angular/core';
import { PlansService } from 'src/app/services/plans.service';

@Component({
  selector: 'app-plans',
  templateUrl: './plans.page.html',
  styleUrls: ['./plans.page.scss'],
})
export class PlansPage implements OnInit {
  planos: any;
  planoAtivo: any = null;
  assinaturaAtiva: any = null;

  constructor(private plansService: PlansService) {}

  ngOnInit() {
    this.plansService.getPlans().then((plans: any) => {
      this.planos = plans.planos;
      console.log('Planos:', plans.planos);
      console.log('Planos:', plans.planoAtivo);
      console.log('Planos:', plans.assinaturaAtiva);
    });
  }
}
