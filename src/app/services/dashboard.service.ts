import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private http: HttpClient, private apiservice: ApiService) {}

  async getDashboardData() {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/dashboard`)
      .toPromise();
    return response;
  }
}
