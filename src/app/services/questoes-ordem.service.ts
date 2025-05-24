import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class QuestoesOrdemService {
  constructor(private http: HttpClient, private apiservice: ApiService) {}

  async getAllQuestoesOrdem() {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/questoes-ordem`)
      .toPromise();
    return response;
  }

  async getQuestoesOrdemById(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/questoes-ordem/${id}`)
      .toPromise();
    return response;
  }

  async deleteQuestoesOrdem(id: number) {
    const response: any = await this.http
      .delete(`${this.apiservice.baseUrl}/questoes-ordem/${id}`)
      .toPromise();
    return response;
  }
}
