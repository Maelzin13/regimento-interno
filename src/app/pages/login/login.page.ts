import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import config from 'capacitor.config';
import { Browser } from '@capacitor/browser';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  nameApp: any;
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private router: Router, private auth: AuthService) {}

  async ngOnInit() {
    this.nameApp = config.appName;

    // Captura de deep links
    App.addListener('appUrlOpen', async (data: any) => {
      const url = data.url;

      if (url.startsWith('myapp://auth-callback')) {
        const queryParams = new URLSearchParams(url.split('?')[1]);
        const token = queryParams.get('token');

        if (token) {
          this.auth.saveAuthToken(token);
          const user = await this.auth.fetchProfile();
          this.auth.setUser(user);
          this.router.navigate(['/home']);
        } else {
          console.error('Token ausente no callback.');
        }
      }
    });

    // Verifica se o usuário já está autenticado
    const token = this.auth.getAuthToken();
    if (token) {
      const user = await this.auth.fetchProfile();
      this.router.navigate(['/home']);
    }
  }

  async login() {
    try {
      const token = await this.auth.login(this.email, this.password);
      const user = await this.auth.fetchProfile();
      this.auth.setUser(user);
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Erro ao fazer login:', error.message);
      this.errorMessage = error.message;
    }
  }

  async socialLogin(provider: string) {
    try {
      const response = await fetch(
        `${this.auth.getBaseUrl()}/auth/${provider}`
      );
      const data = await response.json();

      if (response.ok && data.url) {
        await Browser.open({ url: data.url });
      } else {
        console.error('Erro ao obter a URL do provedor:', data.error);
      }
    } catch (error) {
      console.error('Erro ao iniciar login social:', error);
    }
  }
}
