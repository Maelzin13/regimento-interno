import { Component, OnInit } from '@angular/core';
import { UserModel } from './models/userModel';
import config from 'capacitor.config';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  user: UserModel | null = null;
  nameApp: any;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.nameApp = config.appName;

    const user = this.authService.getUser();
    const token = this.authService.getAuthToken();

    if (token && user) {
      this.user = user;
    } else {
      this.user = null;
    }
  }

  logout() {
    this.authService.logout();
    this.user = null;
    this.router.navigate(['/login']);
  }
}
