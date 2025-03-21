import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class PlansService {
  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  /**
   * Obtém a lista de planos disponíveis na API
   */
  async getPlans(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiService.baseUrl}/plans`, {
        headers: {
          Authorization: `Bearer ${this.authService.getAuthToken()}`,
        },
      });
      return response.data.plans;
    } catch (error: any) {
      console.error('Erro ao obter planos:', error);
      throw new Error('Não foi possível carregar os planos.');
    }
  }

  /**
   * Obtém os detalhes da assinatura ativa do usuário
   */
  async getUserSubscription(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiService.baseUrl}/subscription`,
        {
          headers: {
            Authorization: `Bearer ${this.authService.getAuthToken()}`,
          },
        }
      );
      return response.data.subscription;
    } catch (error: any) {
      console.error('Erro ao obter assinatura:', error);
      return null;
    }
  }

  /**
   * Inicia o processo de assinatura do usuário no Stripe
   */
  async subscribe(planId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiService.baseUrl}/subscribe`,
        { plan_id: planId },
        {
          headers: {
            Authorization: `Bearer ${this.authService.getAuthToken()}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao processar assinatura:', error);
      throw new Error('Erro ao processar assinatura.');
    }
  }

  /**
   * Cancela a assinatura ativa do usuário
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      await axios.post(
        `${this.apiService.baseUrl}/cancel-subscription`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.authService.getAuthToken()}`,
          },
        }
      );
      return true;
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      return false;
    }
  }
}
