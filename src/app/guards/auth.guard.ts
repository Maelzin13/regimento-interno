import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const token = this.authService.getAuthToken();
    const user = this.authService.getUser();
    if (token && user) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}
