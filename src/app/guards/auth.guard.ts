import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const token = this.authService.getAuthToken();
    const user = this.authService.getUser();

    if (token && user) {
      return true; // Permite acesso
    } else {
      this.router.navigate(['/login']); // Redireciona para o login
      return false; // Bloqueia acesso
    }
  }
}
