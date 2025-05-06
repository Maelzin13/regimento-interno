import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private apiservice: ApiService, private http: HttpClient) {}

  async getAllUsers() {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiservice.baseUrl}/users`)
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      throw new Error('Não foi possível carregar os usuários.');
    }
  }

  async getUsersById(id: number) {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiservice.baseUrl}/users/${id}`)
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      throw new Error('Erro ao buscar dados do usuário.');
    }
  }

  async updateUser(user: any) {
    try {
      await firstValueFrom(
        this.http.put(`${this.apiservice.baseUrl}/users/${user.id}`, user).pipe(
          catchError((error) => {
            console.error('Erro ao atualizar usuário:', error);
            return throwError(() => new Error('Erro ao atualizar o usuário.'));
          })
        )
      );
    } catch (error: any) {
      throw new Error(
        error.message || 'Erro desconhecido ao atualizar o usuário.'
      );
    }
  }
}
