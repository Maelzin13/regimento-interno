import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  user: UserModel | null = null;

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    const user = this.authService.getUser();
    this.user = user;
  }

  async logout() {
    await this.authService.logout();
  }
}
