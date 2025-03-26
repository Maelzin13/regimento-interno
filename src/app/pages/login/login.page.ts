import config from 'capacitor.config';
import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
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
        localStorage.setItem('authUser', JSON.stringify(user));
        this.authService.userChanged.next(user);
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Usuário não autenticado ou erro ao buscar perfil:', error);
    }
  }

  async login() {
    try {
      const token = await this.authService.login(this.email, this.password);
      this.authService.saveAuthToken(token);

      const userProfile = await this.authService.fetchProfile();
      localStorage.setItem('authUser', JSON.stringify(userProfile));
      this.authService.userChanged.next(userProfile);

      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Erro ao fazer login:', error.message);
      this.errorMessage = error.message;
    }
  }

  async loginWithGoogle() {
    try {
      const response = await this.authService.googleLogin();

      if (response && response.user && response.token) {
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        this.errorMessage = 'Login com Google falhou.';
        console.error('Login com Google falhou.');
      }
    } catch (error) {
      this.errorMessage = 'Erro no login com Google.';
      console.error('Erro no login com Google:', error);
    }
  }

  async loginWithFacebook() {
    try {
      const response = await this.authService.facebookLogin();

      if (response && response.user && response.token) {
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 500);
      } else {
        this.errorMessage = 'Login com Facebook falhou.';
        console.error('Login com Facebook falhou.');
      }
    } catch (error) {
      this.errorMessage = 'Erro no login com Facebook.';
      console.error('Erro no login com Facebook:', error);
    }
  }
}
