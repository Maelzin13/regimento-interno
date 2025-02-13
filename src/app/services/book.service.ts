import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class BookService {
  constructor(private apiservice: ApiService) {}

  async getAllBooks() {
    const response = await axios.get(`${this.apiservice.baseUrl}/books`);
    return response.data;
  }

  async getBookById(id: number) {
    const response = await axios.get(`${this.apiservice.baseUrl}/books/${id}`);

    return response.data.data;
  }

  async updateBook(id: number, book: any) {
    const response = await axios.put(
      `${this.apiservice.baseUrl}/books/${id}`,
      book
    );
    return response.data;
  }

  async getAllContent() {
    const response = await axios.get(`${this.apiservice.baseUrl}/content`);
    return response.data;
  }

  async searchBook(id: number, query: string, searchBy: string) {
    const url = `${
      this.apiservice.baseUrl
    }/books/${id}?query=${encodeURIComponent(
      query
    )}&search_by=${encodeURIComponent(searchBy)}`;

    const response = await axios.get(url);

    return response.data;
  }
}
