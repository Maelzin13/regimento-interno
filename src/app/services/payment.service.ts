import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private apiservice: ApiService) {}

  async processPayment(paymentData: any) {
    const response = await axios.post(
      `${this.apiservice.baseUrl}/payment/process`,
      paymentData
    );

    return response.data;
  }
}
