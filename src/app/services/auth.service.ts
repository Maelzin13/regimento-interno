import {
  signOut,
  signInWithPopup,
  getRedirectResult,
  signInWithRedirect,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Capacitor } from '@capacitor/core';
import { UserModel } from '../models/userModel';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';
import { FacebookLogin } from '@capacitor-community/facebook-login';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'authToken';
  userChanged = new BehaviorSubject<UserModel | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    private apiService: ApiService,
    private cookieService: CookieService
  ) {}

  getBaseUrl(): string {
    return this.apiService.baseUrl;
  }

  getUser(): UserModel | null {
    const user = localStorage.getItem('authUser');
    return user ? JSON.parse(user) : null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  saveAuthToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.cookieService.set(this.tokenKey, token);
  }

  async login(email: string, password: string): Promise<string> {
    try {
      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/auth/login`, { email, password })
        .toPromise();

      const token = response.access_token;
      this.saveAuthToken(token);

      return token;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao fazer login.';
      throw new Error(message);
    }
  }

  async register(user: UserModel): Promise<string> {
    try {
      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/register`, {
          name: user.name,
          email: user.email,
          password: user.password,
        })
        .toPromise();

      const token = response.access_token;
      this.saveAuthToken(token);

      return token;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao registrar usuário.';
      throw new Error(message);
    }
  }

  async fetchProfile(): Promise<any> {
    try {
      const response = await this.http
        .get(`${this.apiService.baseUrl}/profile`)
        .toPromise();
      return response;
    } catch (error: any) {
      if (error.status === 401) {
        this.logout();
      }
      throw new Error(
        'Erro ao buscar perfil do usuário. Por favor, tente novamente.'
      );
    }
  }

  async googleLogin() {
    try {
      const platform = Capacitor.getPlatform();

      if (platform === 'ios') {
        const config = {
          appId:
            '202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q.apps.googleusercontent.com',
          authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          accessTokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
          resourceUrl: 'https://www.googleapis.com/userinfo/v2/me',
          scope: 'email profile openid',
          redirectUrl:
            'com.googleusercontent.apps.202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q:/oauth2redirect',
          responseType: 'code',
          pkceEnabled: true,
          logsEnabled: true,
          additionalParameters: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        };

        const result = await GenericOAuth2.authenticate(config);

        const accessToken = result?.access_token || result?.accessToken;

        if (!accessToken) {
          throw new Error('Não foi possível obter o accessToken');
        }

        const response: any = await this.http
          .post(`${this.apiService.baseUrl}/auth/social-login/google`, {
            token: accessToken,
          })
          .toPromise();

        this.saveAuthToken(response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        this.userChanged.next(response.user);

        return response;
      }

      if (platform === 'web') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;

        if (!accessToken) throw new Error('AccessToken não encontrado');

        const response: any = await this.http
          .post(`${this.apiService.baseUrl}/auth/social-login/google`, {
            token: accessToken,
          })
          .toPromise();

        this.saveAuthToken(response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        this.userChanged.next(response.user);

        return response;
      }

      // Android
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
      return null;
    } catch (error: any) {
      throw new Error('Erro ao fazer login com Google: ' + error.message);
    }
  }

  async handleRedirectCallback(): Promise<void> {
    try {
      const result = await getRedirectResult(auth);
      if (!result || !result.user) return;

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (!accessToken) throw new Error('AccessToken não encontrado');

      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/auth/social-login/google`, {
          token: accessToken,
        })
        .toPromise();

      this.saveAuthToken(response.token);
      localStorage.setItem('authUser', JSON.stringify(response.user));
      this.userChanged.next(response.user);

      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Erro no retorno do login Google:', error.message);
    }
  }

  async facebookLogin() {
    try {
      let accessToken: string;

      if (Capacitor.getPlatform() === 'web') {
        const provider = new FacebookAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const credential = FacebookAuthProvider.credentialFromResult(result);
        accessToken = credential?.accessToken ?? '';
      } else {
        const result = await FacebookLogin.login({
          permissions: ['email', 'public_profile'],
        });
        accessToken = result?.accessToken?.token ?? '';
      }

      if (!accessToken) {
        throw new Error('Falha ao obter token do Facebook.');
      }

      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/auth/social-login/facebook`, {
          token: accessToken,
        })
        .toPromise();

      this.saveAuthToken(response.token);
      localStorage.setItem('authUser', JSON.stringify(response.user));
      this.userChanged.next(response.user);

      return response;
    } catch (error: any) {
      throw new Error('Erro ao fazer login com Facebook: ' + error.message);
    }
  }

  async logout(): Promise<void> {
    try {
      // Verifica se o usuário está autenticado com o Firebase antes de tentar fazer logout
      const currentUser = auth.currentUser;
      if (currentUser) {
        await signOut(auth);
      }
      
      // Limpa todos os dados de autenticação
      this.cookieService.delete(this.tokenKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('authUser');
      this.userChanged.next(null);

      // Redireciona para a página de login
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      console.error('Erro ao deslogar:', error);
      // Mesmo com erro, tenta limpar os dados locais
      this.cookieService.delete(this.tokenKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('authUser');
      this.userChanged.next(null);
      
      // Força o redirecionamento mesmo em caso de erro
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
