import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  constructor(private http: HttpClient, private apiservice: ApiService) {}

  async getAllBooks() {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/books`)
      .toPromise();
    return response;
  }

  async getBookById(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/books/${id}`)
      .toPromise();

    return response.data;
  }

  async updateBook(id: number, book: any) {
    return this.http
      .put(`${this.apiservice.baseUrl}/books/${id}`, book)
      .toPromise();
  }

  async getAllContent() {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/content`)
      .toPromise();
    return response.data;
  }

  async getTituloById(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/titulos/${id}`)
      .toPromise();
    return response.data;
  }

  async getCapituloById(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/capitulos/${id}`)
      .toPromise();
    return response.data;
  }

  async getSecaoById(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/secaos/${id}`)
      .toPromise();
    return response.data;
  }

  async getArtigoById(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/artigos/${id}`)
      .toPromise();
    return response.data;
  }

  async getParagrafos(id: number) {
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/paragrafos/${id}`)
      .toPromise();
    return response.data;
  }

  async getNotesById(id: number) {
    console.log('id', id);
    const response: any = await this.http
      .get(`${this.apiservice.baseUrl}/notas/${id}`)
      .toPromise();
    return response;
  }
}
