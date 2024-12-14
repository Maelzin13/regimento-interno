import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'http://localhost:8000/api';
  constructor() {}

  async isLoggedIn(): Promise<boolean> {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return false;
      }

      const response = await axios.get(`${this.baseUrl}/auth/check`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.isAuthenticated;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  }

  saveToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }
}
