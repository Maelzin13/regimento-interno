import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';
import { UserModel } from '../models/userModel';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private baseUrl = `${environment.baseUrl}/api`;

  constructor() {}

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
      this.saveToken(token);
      const user = response.data.user;
      this.saveUser(user);

      return token;
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);

      // Exemplo de como exibir erros detalhados
      if (error.response) {
        console.error('Resposta do servidor:', error.response.data);
      }

      return '';
    }
  }

  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
    // Configurar o token nos cabeçalhos padrão
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  saveUser(user: { name: string; email: string; photo?: string }): void {
    localStorage.setItem('authUser', JSON.stringify(user));
  }

  getUser(): UserModel | null {
    return UserModel.fromLocalStorage();
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
