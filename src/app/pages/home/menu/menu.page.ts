import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {
  constructor(private authService: AuthService) {}

  async ngOnInit() {
    console.log('');
  }

  async logout() {
    await this.authService.logout();
  }
}
