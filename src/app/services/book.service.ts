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
    const response: any = await firstValueFrom(
      this.http.get(`${this.apiservice.baseUrl}/books/${id}`)
    );
  
    return response.data;
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
