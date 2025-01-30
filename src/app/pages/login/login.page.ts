import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(private router: Router, private authService: AuthService) {}

  async ngOnInit() {
    try {
      this.nameApp = config.appName;

      const token = this.authService.getAuthToken();
      if (token) {
        const user = await this.authService.fetchProfile();
        console.log('Usuário autenticado:', user);
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Usuário não autenticado ou erro ao buscar perfil:', error);
    }
  }

  async login() {
    try {
      const token = await this.authService.login(this.email, this.password);
      const user = await this.authService.fetchProfile();
      this.authService.setUser(user);
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Erro ao fazer login:', error.message);
      this.errorMessage = error.message;
    }
  }

  async loginWithGoogle() {
    try {
      const user = await this.authService.googleLogin();
      console.log('Usuário logado:', user);

      if (user) {
        this.authService.setUser(user);
        setTimeout(() => {
          console.log('Redirecionando para /home...');
          this.router.navigate(['/home']);
        }, 500);
      } else {
        console.error('Login com Google falhou.');
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
    }
  }

  async loginWithFacebook() {
    try {
      const user = await this.authService.facebookLogin();
      if (user) {
        console.log('Redirecionando para home...');
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        console.error('Login com Facebook falhou.');
      }
    } catch (error) {
      console.error('Erro no login com Facebook:', error);
    }
  }
}
