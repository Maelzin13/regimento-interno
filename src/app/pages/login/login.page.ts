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
      const user = await this.auth.fetchProfile();
      console.log('Usuário autenticado:', user);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Usuário não autenticado ou erro ao buscar perfil.');
    }
    const user = localStorage.getItem('user');
    if (user) {
      this.router.navigate(['/home']);
    }
  }

  async login() {
    try {
      console.log('Tentando login com:', this.email);

      const token = await this.auth.login(this.email, this.password);
      console.log('Token recebido:', token);

      const user = await this.auth.fetchProfile();
      console.log('Usuário logado:', user);

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
