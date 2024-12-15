import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { GoogleAuth, User } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private platform: Platform, private router: Router) {
    if (this.platform.is('capacitor')) {
      GoogleAuth.initialize(); // Inicializa apenas para Web
    }
  }

  login() {
    console.log('Email:', this.email);
    console.log('Senha:', this.password);
    this.router.navigate(['/home']);
  }

  async loginWithGoogle() {
    try {
      const user: User = await GoogleAuth.signIn();

      console.log('Google User:', user);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Erro ao logar com Google:', error);
    }
  }

  async loginWithFacebook() {
    try {
      const result = await FacebookLogin.login({ permissions: ['email'] });
      if (result.accessToken) {
        console.log('Facebook Token:', result.accessToken.token);
        this.router.navigate(['/home']);
      } else {
        console.log('Login com Facebook cancelado.');
      }
    } catch (error) {
      console.error('Erro ao logar com Facebook:', error);
    }
  }
}
