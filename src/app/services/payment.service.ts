import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private http: HttpClient, private apiservice: ApiService) {}

  async getPayments() {
    try {
      const response: any = await this.http
        .get(`${this.apiservice.baseUrl}/pagamentos`)
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos', error);
      throw error;
    }
  }
}
