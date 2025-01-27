import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseUrl = `${environment.baseUrl}/api`;

  async getAllUsers() {
    const response = await axios.get(`${this.baseUrl}/users`);
    return response.data.data;
  }

  async getUsersById(id: number) {
    const response = await axios.get(`${this.baseUrl}/users/${id}`);

    return response.data.data;
  }
}
