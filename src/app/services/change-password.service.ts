import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError, firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChangePasswordService {
  constructor(private apiService: ApiService, private http: HttpClient) {}

  async changePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ): Promise<any> {
    const payload = {
      current_password: currentPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    };

    try {
      const response = await firstValueFrom(
        this.http
          .post(`${this.apiService.baseUrl}/change-password`, payload)
          .pipe(
            catchError((error) => {
              const msg = error?.error?.message || 'Erro ao alterar a senha.';
              return throwError(() => new Error(msg));
            })
          )
      );

      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao alterar a senha.');
    }
  }
}
