import axios from 'axios';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private apiservice: ApiService) {}

  async getAllUsers() {
    const response = await axios.get(`${this.apiservice.baseUrl}/users`);
    return response.data.data;
  }

  async getUsersById(id: number) {
    const response = await axios.get(`${this.apiservice.baseUrl}/users/${id}`);

    return response.data.data;
  }
}
