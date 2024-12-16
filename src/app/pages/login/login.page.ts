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

  ngOnInit() {
    this.nameApp = config.appName;
  }

  async login() {
    try {
      console.log('Tentando login com:', this.email);

      const response = await this.auth.login(this.email, this.password);

      if (response) {
        console.log('Token recebido:', response);
        this.router.navigate(['/home']); // Redirecionar para a página principal
      } else {
        this.errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      this.errorMessage =
        'Erro ao conectar ao servidor. Tente novamente mais tarde.';
    }
  }

  async socialLogin(provider: string) {
    try {
      const loginUrl = `${this.auth.getBaseUrl()}/auth/${provider}`;

      await Browser.open({ url: loginUrl });

      Browser.addListener('browserFinished', () => {
        console.log('Navegador fechado. Verifique a autenticação.');
      });
    } catch (error) {
      console.error('Erro ao iniciar login social:', error);
    }
  }
}
