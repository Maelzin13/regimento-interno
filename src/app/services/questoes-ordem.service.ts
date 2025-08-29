import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QuestoesOremModel } from '../models/questoesOrem.model';

@Injectable({
  providedIn: 'root',
})
export class QuestoesOrdemService {
  public questao: QuestoesOremModel = new QuestoesOremModel();
  constructor(private http: HttpClient, private apiservice: ApiService) {}

  async getAllQuestoesOrdem() {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/questoes-ordem`)
    );
    return response;
  }

  async getQuestoesOrdemById(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/questoes-ordem/${id}`)
    );
    return response;
  }

  async createQuestoesOrdem(data: any) {
    const response: any = await firstValueFrom(
      this.http.post(`${this.apiservice.baseUrl}/questoes-ordem`, data)
    );
    return response;
  }

  async updateQuestoesOrdem(id: number, data: any) {
    const response: any = await firstValueFrom(
      this.http.put(`${this.apiservice.baseUrl}/questoes-ordem/${id}`, data)
    );
    return response;
  }

  async deleteQuestoesOrdem(id: number) {
    const response: any = await firstValueFrom(
      this.http.delete(`${this.apiservice.baseUrl}/questoes-ordem/${id}`)
    );
    return response;
  }
}
