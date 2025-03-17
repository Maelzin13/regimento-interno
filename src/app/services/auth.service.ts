import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
} from 'firebase/auth';
import axios from 'axios';
import { auth } from '../firebase';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { UserModel } from '../models/userModel';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'authToken';
  userChanged = new BehaviorSubject<UserModel | null>(null);

  constructor(
    private router: Router,
    private apiservice: ApiService,
    private cookieService: CookieService
  ) {
    const token = this.cookieService.get('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    this.loadUserFromStorage();
  }

  loadUserFromStorage() {
    const user = UserModel.fromLocalStorage();
    if (user) {
      this.userChanged.next(user);
    }
  }

  getBaseUrl(): string {
    return this.apiservice.baseUrl;
  }

  setUser(user: any, token: string): void {
    if (user && token) {
      const userData = new UserModel({
        id: user.id,
        email: user.email || '',
        token: token,
        provider: user.provider || '',
        is_admin: user.is_admin || false,
        name: user.name || user.displayName || '',
      });

      userData.saveToLocalStorage();
      localStorage.setItem('authToken', token);
      this.userChanged.next(userData);
    }
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
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async login(email: string, password: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiservice.baseUrl}/auth/login `,
        {
          email,
          password,
        }
      );
      const token = response.data.access_token;

      this.cookieService.set('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const user = await this.fetchProfile();
      this.setUser(user, token);

      return token;
    } catch (error: any) {
      throw new Error(
        'Erro ao conectar ao servidor. Verifique suas credenciais.'
      );
    }
  }

  async register(user: UserModel): Promise<string> {
    try {
      const response = await axios.post(`${this.apiservice.baseUrl}/register`, {
        name: user.name,
        email: user.email,
        password: user.password,
      });

      const token = response.data.access_token;
      this.cookieService.set('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      this.setUser(user, token);

      return token;
    } catch (error: any) {
      throw new Error(
        'Erro ao conectar ao servidor. Verifique suas credenciais.'
      );
    }
  }

  async fetchProfile(): Promise<UserModel> {
    try {
      const response = await axios.get(`${this.apiservice.baseUrl}/profile`);
      return new UserModel(response.data.user);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        this.logout();
      }
      throw new Error(
        'Erro ao buscar perfil do usuário. Por favor, tente novamente.'
      );
    }
  }

  async googleLogin() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error('Falha ao obter accessToken do Google.');
      }

      const response = await axios.post(
        `${this.apiservice.baseUrl}/social-login/google`,
        {
          token: accessToken,
        }
      );

      this.setUser(response.data.user, response.data.token);
      this.saveAuthToken(response.data.token);

      return response.data;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      return null;
    }
  }

  async facebookLogin() {
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');

      const result = await signInWithPopup(auth, provider);
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error('Falha ao obter accessToken do Facebook.');
      }

      const response = await axios.post(
        `${this.apiservice.baseUrl}/social-login/facebook`,
        {
          token: accessToken,
        }
      );

      this.setUser(response.data.user, response.data.token);
      this.saveAuthToken(response.data.token);

      return response.data;
    } catch (error) {
      console.error('Erro no login com Facebook:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      UserModel.clearLocalStorage();
      this.cookieService.delete('authToken');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      delete axios.defaults.headers.common['Authorization'];
      this.userChanged.next(null);
      setTimeout(() => {
        window.location.reload();
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }, 300);
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}
