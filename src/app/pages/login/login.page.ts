import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Browser } from '@capacitor/browser';
import config from 'capacitor.config';
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
    try {
      this.nameApp = config.appName;

      const token = this.auth.getAuthToken();
      if (token) {
        const user = await this.auth.fetchProfile();
        console.log('Usuário autenticado:', user);
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Usuário não autenticado ou erro ao buscar perfil:', error);
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

        Browser.addListener('browserFinished', () => {
          console.log('Navegador fechado. Verifique a autenticação.');
        });
      } else {
        console.error('Erro ao obter a URL do provedor:', data.error);
      }
    } catch (error) {
      console.error('Erro ao iniciar login social:', error);
    }
  }
}
