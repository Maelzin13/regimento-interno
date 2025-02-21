import { Injectable } from '@angular/core';
import axios from 'axios'; // Importa o axios
import { ApiService } from './api.service'; 

@Injectable({
  providedIn: 'root',
})
export class PagamentosService {
  constructor(private apiservice: ApiService) {}

  // Método para obter todos os pagamentos
  async getPagamentos() {
    try {
      const response = await axios.get(`${this.apiservice.baseUrl}/pagamentos`);
      return response.data.data; 
    } catch (error) {
      console.error('Erro ao buscar pagamentos', error);
      throw error; 
    }
  }
}
