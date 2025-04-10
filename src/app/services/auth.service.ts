import {
  signOut,
  signInWithPopup,
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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
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
      let idToken: string;

      if (Capacitor.getPlatform() === 'web') {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const credential = GoogleAuthProvider.credentialFromResult(result);
        idToken = credential?.accessToken ?? '';
      } else {
        const result = await GoogleAuth.signIn();
        idToken = result.authentication.idToken;
      }

      if (!idToken) {
        throw new Error('Falha ao obter o token do Google.');
      }

      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/auth/social-login/google`, {
          token: idToken,
        })
        .toPromise();

      this.saveAuthToken(response.token);
      return response;
    } catch (error: any) {
      throw new Error('Erro ao fazer login com Google: ' + error.message);
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
      return response;
    } catch (error: any) {
      throw new Error('Erro ao fazer login com Facebook: ' + error.message);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.cookieService.delete(this.tokenKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('authUser');
      this.userChanged.next(null);

      setTimeout(() => {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }, 300);
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}
