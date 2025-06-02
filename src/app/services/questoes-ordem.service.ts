import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QuestoesOremModel } from '../models/questoesOrem.model';

@Injectable({
  providedIn: 'root',
})
export class QuestoesOrdemService {
  public questao: QuestoesOremModel = new QuestoesOremModel();
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

  async createQuestoesOrdem(data: any) {
    const response: any = await this.http
      .post(`${this.apiservice.baseUrl}/questoes-ordem`, data)
      .toPromise();
    return response;
  }

  async updateQuestoesOrdem(id: number, data: any) {
    const response: any = await this.http
      .put(`${this.apiservice.baseUrl}/questoes-ordem/${id}`, data)
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
