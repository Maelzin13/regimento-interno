import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FacebookLogin } from '@capacitor-community/facebook-login';
import {
  GoogleAuth,
  Authentication,
} from '@codetrix-studio/capacitor-google-auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  user = {
    name: '',
    email: '',
    photo: '',
  };

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadUserData();
  }

  async loadUserData() {
    try {
      // Tenta carregar os dados do Google
      const googleAuth: Authentication = await GoogleAuth.refresh(); // Atualiza o token

      if (googleAuth && googleAuth.accessToken) {
        console.log('googleAuth', googleAuth);
        const googleUser = await this.getGoogleUserInfo(googleAuth.accessToken);
        console.log('googleUser', googleUser);
        if (googleUser) {
          this.user = {
            name: googleUser.name,
            email: googleUser.email,
            photo: googleUser.picture,
          };
          return;
        }
      }

      // Tenta carregar os dados do Facebook
      const facebookAccessToken = await FacebookLogin.getCurrentAccessToken();
      if (facebookAccessToken?.accessToken) {
        const token = facebookAccessToken.accessToken;
        const profileResponse = await fetch(
          `https://graph.facebook.com/me?fields=name,email,picture&access_token=${token}`
        );
        const profile = await profileResponse.json();
        this.user = {
          name: profile.name,
          email: profile.email,
          photo: profile.picture.data.url,
        };
        return;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }

  async getGoogleUserInfo(accessToken: string) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      );
      return await response.json();
    } catch (error) {
      console.error('Erro ao obter informações do Google User:', error);
      return null;
    }
  }

  async logout() {
    try {
      await GoogleAuth.signOut();
      await FacebookLogin.logout();
      this.user = { name: '', email: '', photo: '' };
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}
