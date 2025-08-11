import {
  signOut,
  signInWithPopup,
  getRedirectResult,
  signInWithRedirect,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth } from '../firebase';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Capacitor } from '@capacitor/core';
import { UserModel } from '../models/userModel';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';

@Injectable({
  providedIn: 'root',
})
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
    try {
      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/login`, { email, password })
        .toPromise();

      const token = response.access_token;
      this.saveAuthToken(token);

      return token;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao fazer login.';
      throw new Error(message);
    }
  }

  async register(user: UserModel): Promise<string> {
    try {
      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/register`, {
          name: user.name,
          email: user.email,
          password: user.password,
        })
        .toPromise();

      const token = response.access_token;
      this.saveAuthToken(token);

      return token;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao registrar usuário.';
      throw new Error(message);
    }
  }

  async fetchProfile(): Promise<any> {
    try {
      const response = await this.http
        .get(`${this.apiService.baseUrl}/profile`)
        .toPromise();
      return response;
    } catch (error: any) {
      if (error.status === 401) {
        this.logout();
      }
      throw new Error(
        'Erro ao buscar perfil do usuário. Por favor, tente novamente.'
      );
    }
  }

  async googleLogin(): Promise<any> {
    try {
      const platform = Capacitor.getPlatform();
  
      // =========================
      // iOS (Generic OAuth2 + PKCE)
      // =========================
      if (platform === 'ios') {
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
          additionalParameters: {
            // NÃO force o chooser:
            // prompt: 'select_account',
            access_type: 'offline' // para receber refresh_token no 1º consent
          }
        } as const;
  
        // 1) Tente refresh silencioso antes de abrir o navegador
        const storedRefresh = localStorage.getItem('google_refresh_token'); // ideal: Keychain/Preferences
        if (storedRefresh) {
          const body = new URLSearchParams({
            client_id: config.appId,
            grant_type: 'refresh_token',
            refresh_token: storedRefresh
          });
  
          try {
            const refreshed: any = await this.http
              .post(config.accessTokenEndpoint, body.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
              })
              .toPromise();
  
            if (refreshed?.access_token) {
              const response: any = await this.http
                .post(`${this.apiService.baseUrl}/auth/social-login/google`, { token: refreshed.access_token })
                .toPromise();
  
              this.saveAuthToken(response.token);
              localStorage.setItem('authUser', JSON.stringify(response.user));
              this.userChanged.next(response.user);
              return response; // ✅ sem prompt
            }
          } catch {
            // Se falhar, segue para fluxo interativo
          }
        }
  
        // 2) Fluxo interativo (apenas se não rolou silent refresh)
        const result = await GenericOAuth2.authenticate(config);
        const accessToken = (result as any)?.access_token || (result as any)?.accessToken;
        if (!accessToken) throw new Error('Não foi possível obter o accessToken (iOS)');
  
        // Guarde o refresh_token se veio
        if ((result as any)?.refresh_token) {
          localStorage.setItem('google_refresh_token', (result as any).refresh_token);
        }
  
        const response: any = await this.http
          .post(`${this.apiService.baseUrl}/auth/social-login/google`, { token: accessToken })
          .toPromise();
  
        this.saveAuthToken(response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        this.userChanged.next(response.user);
        return response;
      }
  
      // ============
      // Web (Firebase)
      // ============
      if (platform === 'web') {
        // 1) Persistência local para manter o usuário logado entre reloads
        await setPersistence(auth, browserLocalPersistence);
  
        // 2) Se já há sessão Firebase, tente usar sem abrir popup
        if (auth.currentUser) {
          try {
            // OBS: este é o id_token do Firebase (não o access_token OAuth do Google).
            // Seu backend pode aceitar "id_token" também. Se não aceitar, caímos no fallback do popup.
            const idToken = await auth.currentUser.getIdToken(false);
  
            const response: any = await this.http
              .post(`${this.apiService.baseUrl}/auth/social-login/google`, { id_token: idToken })
              .toPromise();
  
            this.saveAuthToken(response.token);
            localStorage.setItem('authUser', JSON.stringify(response.user));
            this.userChanged.next(response.user);
            return response;
          } catch {
            // Se o backend não aceitar id_token, vamos abrir o popup para pegar o access_token OAuth
          }
        }
  
        // 3) Sem sessão válida no backend → abrir popup (sem forçar chooser)
        const provider = new GoogleAuthProvider();
  
        // NÃO force o seletor:
        // provider.setCustomParameters({ prompt: 'select_account' });
  
        // Use login_hint se souber o email anterior
        const lastEmail = localStorage.getItem('lastGoogleEmail');
        if (lastEmail) provider.setCustomParameters({ login_hint: lastEmail });
  
        const result = await signInWithPopup(auth, provider);
        const email = result.user?.email;
        if (email) localStorage.setItem('lastGoogleEmail', email);
  
        // Aqui pegamos o access_token OAuth do Google
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        if (!accessToken) throw new Error('AccessToken não encontrado (Web)');
  
        const response: any = await this.http
          .post(`${this.apiService.baseUrl}/auth/social-login/google`, { token: accessToken })
          .toPromise();
  
        this.saveAuthToken(response.token);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        this.userChanged.next(response.user);
        return response;
      }
  
      // ===============
      // Android (Firebase Redirect)
      // ===============
      const provider = new GoogleAuthProvider();
      // NÃO force o chooser:
      // provider.setCustomParameters({ prompt: 'select_account' });
      const lastEmail = localStorage.getItem('lastGoogleEmail');
      if (lastEmail) provider.setCustomParameters({ login_hint: lastEmail });
  
      await signInWithRedirect(auth, provider);
      return null; // o fluxo continua em handleRedirectCallback()
  
    } catch (error: any) {
      throw new Error('Erro ao fazer login com Google: ' + (error?.message || error));
    }
  }
  
  /**
   * Deve ser chamado após o redirect (Android) — ex.: no app.component ou na tela de login.
   */
  async handleRedirectCallback(): Promise<void> {
    try {
      const result = await getRedirectResult(auth);
      if (!result || !result.user) return;
  
      // Guarde o e-mail para login_hint em próximos logins
      const email = result.user?.email;
      if (email) localStorage.setItem('lastGoogleEmail', email);
  
      // Extraia o access_token OAuth do Google
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (!accessToken) throw new Error('AccessToken não encontrado (Android)');
  
      const response: any = await this.http
        .post(`${this.apiService.baseUrl}/auth/social-login/google`, { token: accessToken })
        .toPromise();
  
      this.saveAuthToken(response.token);
      localStorage.setItem('authUser', JSON.stringify(response.user));
      this.userChanged.next(response.user);
  
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Erro no retorno do login Google:', error?.message || error);
    }
  }

  async logout(): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await signOut(auth);
      }

      this.cookieService.delete(this.tokenKey);
      this.cookieService.deleteAll('/');
      localStorage.clear();
      sessionStorage.clear();
      this.userChanged.next(null);

      await this.router.navigateByUrl('/login', { replaceUrl: true });
      window.location.reload();
    } catch (error) {
      console.error('Erro ao deslogar:', error);
      this.cookieService.deleteAll('/');
      localStorage.clear();
      sessionStorage.clear();
      this.userChanged.next(null);
      

      await this.router.navigateByUrl('/login', { replaceUrl: true });
      window.location.reload();
    }
  }
}
