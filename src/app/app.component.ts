import { Component, OnInit } from '@angular/core';
import { UserModel } from './models/userModel';
import config from 'capacitor.config';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  user: UserModel | null = null;
  nameApp: any;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.nameApp = config.appName;
    this.authService
      .fetchProfile()
      .then((user) => {
        console.log('Usuário autenticado:', user);
        this.user = user;
      })
      .catch(() => {
        console.log('Nenhum usuário autenticado.');
      });
  }

  logout() {
    this.authService.logout();
  }
}
