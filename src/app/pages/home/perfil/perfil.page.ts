import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
})
export class PerfilPage implements OnInit {
  user: UserModel | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
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
}
