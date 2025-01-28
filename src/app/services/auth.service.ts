import { Injectable } from '@angular/core';
import axios from 'axios';
import { CookieService } from 'ngx-cookie-service';
import { UserModel } from '../models/userModel';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.baseUrl}/api`;

  constructor(private cookieService: CookieService) {
    const token = this.cookieService.get('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setUser(user: UserModel): void {
    localStorage.setItem('user', JSON.stringify(user)); // Armazena o usuário
  }

  getUser(): UserModel | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getAuthToken(): string | null {
    return this.cookieService.get('authToken');
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

  logout(): void {
    this.cookieService.delete('authToken');
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('user');
  }
}
