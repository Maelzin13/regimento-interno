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
}
