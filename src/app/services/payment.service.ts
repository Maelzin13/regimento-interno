import { Injectable } from '@angular/core';
import axios from 'axios';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private baseUrl = `${environment.baseUrl}/api`;

  async processPayment(paymentData: any) {
    const response = await axios.post(
      `${this.baseUrl}/payment/process`,
      paymentData
    );

    return response.data;
  }
}
