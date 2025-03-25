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
    private apiService: ApiService,
    private cookieService: CookieService
  ) {
    const token = this.cookieService.get('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  getBaseUrl(): string {
    return this.apiService.baseUrl;
  }

  /**
   * Retorna o usuário armazenado.
   */
  getUser(): UserModel | null {
    const user = localStorage.getItem('authUser');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Obtém o token de autenticação armazenado.
   */
  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Salva o token de autenticação e atualiza o header de axios.
   */
  saveAuthToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Efetua o login via e-mail e senha.
   */
  async login(email: string, password: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiService.baseUrl}/auth/login`,
        { email, password }
      );
      const token = response.data.access_token;

      this.cookieService.set('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return token;
    } catch (error: any) {
      throw new Error(
        'Erro ao conectar ao servidor. Verifique suas credenciais.'
      );
    }
  }

  /**
   * Efetua o registro de um novo usuário.
   */
  async register(user: UserModel): Promise<string> {
    try {
      const response = await axios.post(`${this.apiService.baseUrl}/register`, {
        name: user.name,
        email: user.email,
        password: user.password,
      });
      const token = response.data.access_token;
      this.cookieService.set('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return token;
    } catch (error: any) {
      throw new Error(
        'Erro ao conectar ao servidor. Verifique suas credenciais.'
      );
    }
  }

  /**
   * Busca o perfil do usuário autenticado.
   */
  async fetchProfile(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiService.baseUrl}/profile`);
      console.log('response', response.data);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        this.logout();
      }
      throw new Error(
        'Erro ao buscar perfil do usuário. Por favor, tente novamente.'
      );
    }
  }

  /**
   * Realiza o login com o Google utilizando Firebase Authentication.
   */
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
        `${this.apiService.baseUrl}/social-login/google`,
        { token: accessToken }
      );

      this.saveAuthToken(response.data.token);

      return response.data;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      return null;
    }
  }

  /**
   * Realiza o login com o Facebook utilizando Firebase Authentication.
   */
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
        `${this.apiService.baseUrl}/social-login/facebook`,
        { token: accessToken }
      );

      this.saveAuthToken(response.data.token);

      return response.data;
    } catch (error) {
      console.error('Erro no login com Facebook:', error);
      return null;
    }
  }

  /**
   * Efetua o logout do usuário.
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
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
