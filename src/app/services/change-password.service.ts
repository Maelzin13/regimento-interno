import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ChangePasswordService {
  constructor(private apiservice: ApiService) {}

  async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<any> {
    try {
      const payload = {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      };

      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const response = await axios.post(
        `${this.apiservice.baseUrl}/`,
        payload,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Retorna o erro recebido da API
        throw new Error(
          error.response.data.message || 'Erro ao alterar a senha.'
        );
      }
      throw new Error('Erro ao conectar-se ao servidor.');
    }
  }
}
