import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PlansService {
  constructor(private apiService: ApiService, private http: HttpClient) {}

  async getPlans(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<any[]>(`${this.apiService.baseUrl}/plans`).pipe(
          catchError((error) => {
            console.error('Erro ao obter planos:', error);
            return throwError(
              () => new Error('Não foi possível carregar os planos.')
            );
          })
        )
      );

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao buscar planos.');
    }
  }
}
