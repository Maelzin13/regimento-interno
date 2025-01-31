import { Component, OnInit } from '@angular/core';
import { UserModel } from './models/userModel';
import config from 'capacitor.config';
import { AuthService } from './services/auth.service';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  user: UserModel | null = null;
  nameApp: any;

  constructor(
    private authService: AuthService,
    private menuCtrl: MenuController
  ) {}

  ngOnInit() {
    this.nameApp = config.appName;
    this.loadUser();
    this.authService.userChanged.subscribe((user) => {
      this.user = user;
    });
  }

  loadUser() {
    const user = this.authService.getUser();
    const token = this.authService.getAuthToken();

    if (token && user) {
      this.user = user;
    } else {
      this.user = null;
    }
  }

  async logout() {
    await this.authService.logout();
    this.user = null;
    await this.menuCtrl.close();
  }
}
