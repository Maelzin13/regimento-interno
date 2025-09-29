import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError, lastValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class SumarioService {
  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private auth: AuthService
  ) {}

  async getSumario(bookId: number): Promise<any> {
    const url = `${this.apiService.baseUrl}/books/${bookId}/sumario`;
    console.log('Fetching summary from URL:', url);
    const headers = await this.buildAuthHeaders();
    const req$ = this.http.get<any>(url, { headers }).pipe(
      catchError((error) => {
        console.error('Erro ao obter sumário:', error);
        return throwError(
          () => new Error('Não foi possível carregar o sumário.')
        );
      })
    );

    return await lastValueFrom(req$);
  }

  private async buildAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.auth.getAuthToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
