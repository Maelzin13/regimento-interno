import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PlansService {
  constructor(private apiService: ApiService) {}

  /**
   * Obtém a lista de planos disponíveis na API
   */
  async getPlans(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiService.baseUrl}/plans`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter planos:', error);
      throw new Error('Não foi possível carregar os planos.');
    }
  }
}
