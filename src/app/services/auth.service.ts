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

  async login(email: string, password: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/login`, {
        email,
        password,
      });
      const token = response.data.access_token;

      // Salva o token nos cookies
      this.cookieService.set('authToken', token);

      // Configura o token nos cabeçalhos padrão
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

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
    } catch (error) {
      throw new Error('Erro ao buscar perfil do usuário.');
    }
  }

  logout(): void {
    this.cookieService.delete('authToken');
    delete axios.defaults.headers.common['Authorization'];
  }
}
