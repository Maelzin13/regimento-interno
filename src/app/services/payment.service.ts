import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(
    private apiservice: ApiService,
  ) {}

  async getPayments() {
    try {
      const response = await axios.get(`${this.apiservice.baseUrl}/pagamentos`);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos', error);
      throw error;
    }
  }
}
