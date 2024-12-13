import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api'; // URL do backend Laravel

  // Retorna todo o conteúdo (artigos, incisos, etc.)
  async getAllContent() {
    const response = await axios.get(`${this.baseUrl}/content`);
    return response.data;
  }

  async getAllBooks() {
    const response = await axios.get(`${this.baseUrl}/books`);
    return response.data;
  }
}
