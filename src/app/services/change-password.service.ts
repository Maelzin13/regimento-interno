import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ChangePasswordService {
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<any> {
    const payload = {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    };

    const headers = {
      Authorization: `Bearer ${this.authService.getAuthToken()}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(
        `${this.apiService.baseUrl}/change-password`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Erro ao alterar a senha.'
        );
      }
      throw new Error('Erro ao conectar-se ao servidor.');
    }
  }
}
