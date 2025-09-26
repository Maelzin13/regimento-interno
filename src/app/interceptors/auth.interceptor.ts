import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { TokenStorageService } from 'src/app/services/token-storage.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private tokenStorage: TokenStorageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // pular assets locais
    if (req.url.includes('/assets/')) return next.handle(req);

    return new Observable(subscriber => {
      this.tokenStorage.getToken().then(token => {
        let headers = req.headers;
        if (token) headers = headers.set('Authorization', `Bearer ${token}`);
        if (!headers.has('Accept')) headers = headers.set('Accept', 'application/json');
        if (!headers.has('Content-Type') && !(req.body instanceof FormData)) {
          headers = headers.set('Content-Type', 'application/json');
        }

        // Adicionar headers para melhor compatibilidade com iOS
        headers = headers.set('X-Requested-With', 'XMLHttpRequest');
        headers = headers.set('Cache-Control', 'no-cache');

        next.handle(req.clone({ headers }))
          .pipe(
            catchError((err: HttpErrorResponse) => {
              console.error('Erro HTTP no interceptor:', err);
              if (err.status === 401) {
                // Tratamento global de 401 - deslogar usuário
                this.authService.logout();
              }
              return throwError(() => err);
            })
          )
          .subscribe(subscriber);
      }).catch(error => {
        console.error('Erro ao obter token no interceptor:', error);
        // Continuar sem token se houver erro
        next.handle(req).subscribe(subscriber);
      });
    });
  }
}
