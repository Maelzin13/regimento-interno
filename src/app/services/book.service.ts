import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  private bookCache: { [id: number]: any } = {};
  constructor(private http: HttpClient, private apiservice: ApiService, private storage: StorageService) {}

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


  async getBookById(id: number) {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiservice.baseUrl}/books/${id}`)
      );

      return response.data;
    } catch (error: any) {
      console.error('BookService: Erro ao buscar livro:', error);
      
      // Verificar se é erro de rede
      if (error.name === 'FetchError' || error.message?.includes('fetch')) {
        console.error('Erro de rede detectado. Verifique a conectividade.');
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
      }
      
      // Verificar se é erro de servidor
      if (error.status >= 500) {
        console.error('Erro do servidor:', error.status);
        throw new Error('Servidor temporariamente indisponível. Tente novamente em alguns minutos.');
      }
      
      // Verificar se é erro de autorização
      if (error.status === 401 || error.status === 403) {
        console.error('Erro de autorização:', error.status);
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      
      // Erro genérico
      throw new Error('Erro ao carregar o regimento. Tente novamente.');
    }
  }
  
  async clearBookCache(id: number) {
    delete this.bookCache[id];
    await this.storage.remove(`book_${id}`);
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
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/notas/${id}`)
    );
    return response;
  }
}
