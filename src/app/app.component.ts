import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserModel } from './models/userModel';
import config from 'capacitor.config';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  user: UserModel | null = null;
  nameApp: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.nameApp = config.appName;
    const storedUser = UserModel.fromLocalStorage();
    this.user = storedUser ? new UserModel(storedUser) : new UserModel({});
    console.log('Usuário carregado:', this.user);
  }

  logout() {
    UserModel.clearLocalStorage();
    this.user = null;
    this.router.navigate(['/login']);
  }
}
