import { Injectable } from '@angular/core';
import axios from 'axios';
import { CookieService } from 'ngx-cookie-service';
import { UserModel } from '../models/userModel';
import { environment } from 'src/environments/environment';
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.baseUrl}/api`;
  private tokenKey = 'authToken';

  constructor(private cookieService: CookieService) {
    const token = this.cookieService.get('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setUser(user: any): void {
    if (user) {
      const userData = {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        token: user.stsTokenManager?.accessToken || '',
      };

      localStorage.setItem('authUser', JSON.stringify(userData));
      localStorage.setItem('authToken', userData.token);

      console.log('Usuário salvo:', userData);
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
    localStorage.setItem(this.tokenKey, token); // Armazena no localStorage
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async login(email: string, password: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/login`, {
        email,
        password,
      });
      const token = response.data.access_token;

      this.cookieService.set('authToken', token); // Armazena o token no cookie
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const user = await this.fetchProfile();
      this.setUser(user); // Armazena o usuário no localStorage

      return token;
    } catch (error: any) {
      throw new Error(
        'Erro ao conectar ao servidor. Verifique suas credenciais.'
      );
    }
  }

  async fetchProfile(): Promise<UserModel> {
    try {
      const response = await axios.get(`${this.baseUrl}/profile`);
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
      const result = await signInWithPopup(auth, provider);
      console.log('Usuário logado:', result.user);
      return result.user;
    } catch (error) {
      console.error('Erro no login com Google:', error);
      return null;
    }
  }

  async facebookLogin() {
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      const result = await signInWithPopup(auth, provider);
      console.log('Usuário logado:', result.user);
      return result.user;
    } catch (error) {
      console.error('Erro no login com Facebook:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.cookieService.delete('authToken');
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('user');
      console.log('Usuário deslogado');
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  }
}
