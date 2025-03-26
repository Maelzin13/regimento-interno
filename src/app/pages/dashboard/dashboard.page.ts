import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
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
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.dashboardService.getDashboardData().then(async (data) => {
      this.data = await data;
    });
  }

  async fecharModal() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
