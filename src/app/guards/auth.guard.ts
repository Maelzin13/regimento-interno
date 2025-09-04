import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    const user = this.auth.getUser();
    const isTokenValid = await this.auth.isTokenValid();
    
    if (!user || !isTokenValid) {
      console.warn('[AuthGuard] Bloqueado. Redirecionando...');
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    
    return true;
  }
}
