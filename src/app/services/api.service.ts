import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = `${environment.baseUrl}/api`;

  async getAllContent() {
    const response = await axios.get(`${this.baseUrl}/content`);
    return response.data;
  }

  async getAllBooks() {
    const response = await axios.get(`${this.baseUrl}/books`);
    return response.data;
  }

  async getBookById(id: number) {
    const response = await axios.get(`${this.baseUrl}/books/${id}`);

    return response.data.data;
  }

  async searchBook(id: number, query: string, searchBy: string) {
    const url = `${this.baseUrl}/books/${id}?query=${encodeURIComponent(
      query
    )}&search_by=${encodeURIComponent(searchBy)}`;

    const response = await axios.get(url);

    return response.data;
  }

  async updateBook(id: number, book: any) {
    const response = await axios.put(`${this.baseUrl}/books/${id}`, book);
    return response.data;
  }
}
