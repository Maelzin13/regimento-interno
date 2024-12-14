import { Component } from '@angular/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
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

  constructor(private router: Router) {}

  login() {
    console.log('Email:', this.email);
    console.log('Senha:', this.password);

    // Verifique se o usuário já está na página de home
    if (this.router.url !== '/home') {
      this.router.navigate(['/home']);
    }
  }

  async loginWithGoogle() {
    try {
      const googleUser = await GoogleAuth.signIn();
      console.log('Google User:', googleUser);
      // Navegar para a página de home após o login
      if (this.router.url !== '/home') {
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Erro ao logar com Google:', error);
    }
  }

  async loginWithFacebook() {
    try {
      const result = await FacebookLogin.login({ permissions: ['email'] });
      if (result.accessToken) {
        console.log('Facebook Access Token:', result.accessToken.token);
        // Navegar para a página de home após o login
        if (this.router.url !== 'home') {
          this.router.navigate(['home']);
        }
      } else {
        console.error('Login com Facebook cancelado.');
      }
    } catch (error) {
      console.error('Erro ao logar com Facebook:', error);
    }
  }
}
