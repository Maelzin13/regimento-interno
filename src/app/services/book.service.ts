import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private bookCache: { [id: number]: any } = {};
  constructor(private http: HttpClient, private apiservice: ApiService) {}

  async getAllBooks() {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/books`)
    );
    return response;
  }

  async getBookByIdLimit(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/livros-limitados/${id}`)
    );
    return response;
  }


  async getBookById(id: number, forceRefresh = false) {
    const cacheKey = `book_${id}`;
    if (!forceRefresh) {
      // 1. Verifica cache em memória
      if (this.bookCache[id]) return this.bookCache[id];
      // 2. Verifica localStorage
      const localData = localStorage.getItem(cacheKey);
      if (localData) {
        try {
          const data = JSON.parse(localData);
          // Valide se não está velho demais (exemplo: 1h)
          if (Date.now() - data.timestamp < 1000 * 60 * 60) {
            this.bookCache[id] = data.value;
            return data.value;
          }
        } catch (e) {}
      }
    }
  
    // 3. Busca do backend
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/books/${id}`)
    );
    // Salva em memória e no localStorage
    this.bookCache[id] = response.data;
    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      value: response.data
    }));
  
    return response.data;
  }
  
  clearBookCache(id: number) {
    delete this.bookCache[id];
    localStorage.removeItem(`book_${id}`);
  }

  async updateBook(id: number, book: any) {
    return firstValueFrom(
      this.http.put(`${this.apiservice.baseUrl}/books/${id}`, book)
    );
  }

  async getAllContent() {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/content`)
    );
    return response.data;
  }

  async getTituloById(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/titulos/${id}`)
    );
    return response.data;
  }

  async getCapituloById(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/capitulos/${id}`)
    );
    return response.data;
  }

  async getSecaoById(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/secaos/${id}`)
    );
    return response.data;
  }

  async getArtigoById(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/artigos/${id}`)
    );
    return response.data;
  }

  async getParagrafos(id: number) {
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/paragrafos/${id}`)
    );
    return response.data;
  }

  async getNotesById(id: number) {
    console.log('id', id);
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/notas/${id}`)
    );
    return response;
  }
}
