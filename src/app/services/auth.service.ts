
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Capacitor } from '@capacitor/core';
import { UserModel } from '../models/userModel';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'authToken';
  userChanged = new BehaviorSubject<UserModel | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    private apiService: ApiService,
    private cookieService: CookieService
  ) {}

  getBaseUrl(): string {
    return this.apiService.baseUrl;
  }

  getUser(): UserModel | null {
    const user = localStorage.getItem('authUser');
    return user ? JSON.parse(user) : null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  saveAuthToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.cookieService.set(this.tokenKey, token);
  }
  
  async login(email: string, password: string): Promise<string> {
    const resp: any = await this.http
      .post(`${this.apiService.baseUrl}/login`, { email, password })
      .toPromise();

    const token = resp.access_token;
    this.saveAuthToken(token);
    return token;
  }

  async register(user: UserModel): Promise<string> {
    const resp: any = await this.http
      .post(`${this.apiService.baseUrl}/register`, {
        name: user.name,
        email: user.email,
        password: user.password,
      })
      .toPromise();

    const token = resp.access_token;
    this.saveAuthToken(token);
    return token;
  }

  async fetchProfile(): Promise<any> {
    try {
      return await this.http.get(`${this.apiService.baseUrl}/profile`).toPromise();
    } catch (error: any) {
      if (error.status === 401) this.logout();
      throw new Error('Erro ao buscar perfil do usuário.');
    }
  }

  /**
   * Google login apenas para Android e iOS (nativo). Web é bloqueado.
   */
  async googleLogin(): Promise<any> {
    const platform = Capacitor.getPlatform();
    if (platform !== 'android' && platform !== 'ios') {
      throw new Error('Login Google disponível somente em Android e iOS.');
    }

    if (platform === 'android') {
      // 1) Login nativo (sem browser)
      const result = await FirebaseAuthentication.signInWithGoogle();
    
      // 2) Pegue o token CERTO para o backend
      const googleIdToken   = result?.credential?.idToken;      // ✅ preferido
      const googleAccessTok = result?.credential?.accessToken;  // fallback
    
      if (!googleIdToken && !googleAccessTok) {
        // Se cair aqui, quase sempre é falta de SHA-1/SHA-256 no Firebase
        throw new Error(
          'Google não retornou idToken nem accessToken. Verifique SHA-1/SHA-256 no Firebase e o google-services.json.'
        );
      }
    
      const tokenForBackend = googleIdToken ?? googleAccessTok;
    
      // 3) Envie exatamente no campo "token" (o backend exige isso)
      const response: any = await this.http.post(
        `${this.apiService.baseUrl}/auth/social-login/google`,
        { token: tokenForBackend }  // 👈 NADA de getIdToken() do Firebase aqui
      ).toPromise();
    
      // persistência/estado
      this.saveAuthToken(response.token);
      localStorage.setItem('authUser', JSON.stringify(response.user));
      this.userChanged.next(response.user);
      return response;
    }
    

    // iOS — Generic OAuth2 + PKCE (sem browser externo do app)
    const config = {
      appId: '202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q.apps.googleusercontent.com',
      authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      accessTokenEndpoint: 'https://www.googleapis.com/oauth2/v4/token',
      resourceUrl: 'https://www.googleapis.com/userinfo/v2/me',
      scope: 'email profile openid',
      redirectUrl: 'com.googleusercontent.apps.202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q:/oauth2redirect',
      responseType: 'code',
      pkceEnabled: true,
      logsEnabled: true,
      additionalParameters: { access_type: 'offline' }
    } as const;

    // Silent refresh (se tiver)
    const storedRefresh = localStorage.getItem('google_refresh_token');
    if (storedRefresh) {
      const body = new URLSearchParams({
        client_id: config.appId,
        grant_type: 'refresh_token',
        refresh_token: storedRefresh
      });
      try {
        const refreshed: any = await this.http.post(
          config.accessTokenEndpoint, body.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        ).toPromise();

        if (refreshed?.access_token) {
          const resp: any = await this.http.post(
            `${this.apiService.baseUrl}/auth/social-login/google`,
            { token: refreshed.access_token, kind: 'google_access_token' }
          ).toPromise();

          this.saveAuthToken(resp.token);
          localStorage.setItem('authUser', JSON.stringify(resp.user));
          this.userChanged.next(resp.user);
          return resp;
        }
      } catch {
        console.log('Não foi possível obter o access_token no iOS');
        throw new Error('Não foi possível obter o access_token no iOS');
      }
    }

    // Fluxo interativo
    const result: any = await GenericOAuth2.authenticate(config);
    const accessToken = result?.access_token || result?.accessToken;
    if (!accessToken) throw new Error('Não foi possível obter o access_token no iOS');

    if (result?.refresh_token) {
      localStorage.setItem('google_refresh_token', result.refresh_token);
    }

    const response: any = await this.http.post(
      `${this.apiService.baseUrl}/auth/social-login/google`,
      { token: accessToken, kind: 'google_access_token' }
    ).toPromise();

    this.saveAuthToken(response.token);
    localStorage.setItem('authUser', JSON.stringify(response.user));
    this.userChanged.next(response.user);
    return response;
  }

  /**
   * Nativo não usa redirects do Firebase Web. Mantemos NO-OP só por compatibilidade.
   */
  async handleRedirectCallback(): Promise<void> {
    return; // nada a fazer em iOS/Android nativo
  }

  async logout(): Promise<void> {
    try {
      await FirebaseAuthentication.signOut().catch(() => {});
      this.cookieService.delete(this.tokenKey);
      this.cookieService.deleteAll('/');
      localStorage.clear();
      sessionStorage.clear();
      this.userChanged.next(null);
      await this.router.navigateByUrl('/login', { replaceUrl: true });
      window.location.reload();
    } catch (e) {
      this.cookieService.deleteAll('/');
      localStorage.clear();
      sessionStorage.clear();
      this.userChanged.next(null);
      await this.router.navigateByUrl('/login', { replaceUrl: true });
      window.location.reload();
    }
  }
}
