import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private apiservice: ApiService) {}

  async getDashboardData() {
    const response = await axios.get(`${this.apiservice.baseUrl}/dashboard`);
    return response.data;
  }
}
