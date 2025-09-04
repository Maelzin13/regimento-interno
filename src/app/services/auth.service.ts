import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Capacitor } from '@capacitor/core';
import { HttpClient } from '@angular/common/http';
import { UserModel } from 'src/app/models/userModel';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { StorageService } from './storage.service';
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

@Injectable({ providedIn: 'root' })
export class AuthService {
  userChanged = new BehaviorSubject<UserModel | null>(null);

  constructor(
    private router: Router,
    private http: HttpClient,
    private apiService: ApiService,
    private tokenStorage: TokenStorageService,
    private storage: StorageService
  ) {}

  getBaseUrl(): string {
    return this.apiService.baseUrl;
  }

  async getUser(): Promise<UserModel | null> {
    return await this.storage.get<UserModel>('authUser');
  }

  async getAuthToken(): Promise<string | null> {
    return this.tokenStorage.getToken();
  }

  private decodeJwt<T=any>(jwt: string): T | null {
    try {
      const [, payload] = jwt.split('.');
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { 
      return null; 
    }
  }

  async isTokenValid(): Promise<boolean> {
    const token = await this.getAuthToken();
    if (!token) return false;
    
    const payload: any = this.decodeJwt(token);
    if (!payload?.exp) return true;
    return Date.now() < payload.exp * 1000;
  }
  
  async login(email: string, password: string): Promise<string> {
    const resp: any = await firstValueFrom(
      this.http.post(`${this.apiService.baseUrl}/login`, { email, password })
    );

    const token = resp.access_token;
    await this.tokenStorage.setToken(token);
    await this.storage.set('authUser', resp.user ?? null);
    this.userChanged.next(resp.user ?? null);
    return token;
  }

  async register(user: any): Promise<any> {
    try {
      return await firstValueFrom(this.http.post(`${this.apiService.baseUrl}/register`, user));
    } catch (e: any) {
      throw (e?.error ?? { message: 'Erro inesperado.' });
    }
  }

  async fetchProfile(): Promise<any> {
    if (!(await this.isTokenValid())) {
      await this.logout();
      throw new Error('Token expirado');
    }
    
    try {
      return await firstValueFrom(this.http.get(`${this.apiService.baseUrl}/profile`));
    } catch (error: any) {
      if (error.status === 401) {
        await this.logout();
      }
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
      let response: any;
      try {
        response = await firstValueFrom(
          this.http.post(
            `${this.apiService.baseUrl}/auth/social-login/google`,
            { token: tokenForBackend },  // 👈 NADA de getIdToken() do Firebase aqui
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          )
        );
      } catch (error: any) {
        console.error('Erro na requisição para o backend (Android):', error);
        if (error.status === 0) {
          throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
        } else if (error.status === 401) {
          throw new Error('Token inválido ou expirado.');
        } else if (error.status >= 500) {
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        } else {
          throw new Error(`Erro na autenticação: ${error.error?.message || error.message || 'Erro desconhecido'}`);
        }
      }
    
      // persistência/estado
      await this.tokenStorage.setToken(response.token);
      await this.storage.set('authUser', response.user);
      this.userChanged.next(response.user);
      return response;
    }
    

    // iOS — Generic OAuth2 + PKCE (sem browser externo do app)
    const config = {
      appId: '202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q.apps.googleusercontent.com', // iOS client ID específico
      authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      accessTokenEndpoint: 'https://oauth2.googleapis.com/token',
      resourceUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: 'openid email profile',
      redirectUrl: 'com.googleusercontent.apps.202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q:/oauth2redirect',
      responseType: 'code',
      pkceEnabled: true,
      logsEnabled: true,
      additionalParameters: { access_type: 'offline', prompt: 'consent' } // garante refresh_token na 1ª vez
    } as const;

    // Silent refresh (se tiver)
    const storedRefresh = await this.storage.get<string>('google_refresh_token');
    if (storedRefresh) {
      const body = new URLSearchParams({
        client_id: config.appId,
        grant_type: 'refresh_token',
        refresh_token: storedRefresh
      });
      try {
        const refreshed: any = await firstValueFrom(
          this.http.post(
            config.accessTokenEndpoint, body.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          )
        );

        if (refreshed?.access_token) {
          const resp: any = await firstValueFrom(
            this.http.post(
              `${this.apiService.baseUrl}/auth/social-login/google`,
              { token: refreshed.access_token, kind: 'google_access_token' }
            )
          );

          await this.tokenStorage.setToken(resp.token);
          await this.storage.set('authUser', resp.user);
          this.userChanged.next(resp.user);
          return resp;
        }
      } catch {
        console.log('Não foi possível obter o access_token no iOS');
        throw new Error('Não foi possível obter o access_token no iOS');
      }
    }

    // Fluxo interativo
    let result: any;
    try {
      result = await GenericOAuth2.authenticate(config);
    } catch (error: any) {
      console.error('Erro no GenericOAuth2.authenticate:', error);
      throw new Error(`Erro na autenticação OAuth2: ${error.message || 'Erro desconhecido'}`);
    }
    
    const accessToken = result?.access_token || result?.accessToken;
    if (!accessToken) {
      console.error('Resultado do OAuth2:', result);
      throw new Error('Não foi possível obter o access_token no iOS');
    }

    if (result?.refresh_token) {
      await this.storage.set('google_refresh_token', result.refresh_token);
    }

    let response: any;
    try {
      response = await firstValueFrom(
        this.http.post(
          `${this.apiService.baseUrl}/auth/social-login/google`,
          { token: accessToken, kind: 'google_access_token' },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        )
      );
    } catch (error: any) {
      console.error('Erro na requisição para o backend:', error);
      if (error.status === 0) {
        throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
      } else if (error.status === 401) {
        throw new Error('Token inválido ou expirado.');
      } else if (error.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        throw new Error(`Erro na autenticação: ${error.error?.message || error.message || 'Erro desconhecido'}`);
      }
    }

    await this.tokenStorage.setToken(response.token);
    await this.storage.set('authUser', response.user);
    this.userChanged.next(response.user);
    return response;
  }

  /**
   * Apple Sign In apenas para iOS
   */
  async appleLogin(): Promise<any> {
    const platform = Capacitor.getPlatform();
    if (platform !== 'ios') {
      throw new Error('Apple Sign In disponível somente em iOS.');
    }

    try {
      // 1) Login nativo com Apple
      const result = await SignInWithApple.authorize();

      if (!result.response?.identityToken) {
        throw new Error('Apple não retornou o identityToken necessário.');
      }

      const identityToken = result.response.identityToken;
      const authorizationCode = result.response.authorizationCode;

      // 2) Envie o token para o backend
      let response: any;
      try {
        response = await firstValueFrom(
          this.http.post(
            `${this.apiService.baseUrl}/auth/social-login/apple`,
            { 
              token: identityToken,
              authorizationCode: authorizationCode,
              user: result.response.user || null
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          )
        );
      } catch (error: any) {
        console.error('Erro na requisição para o backend (Apple):', error);
        if (error.status === 0) {
          throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
        } else if (error.status === 401) {
          throw new Error('Token inválido ou expirado.');
        } else if (error.status >= 500) {
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        } else {
          throw new Error(`Erro na autenticação: ${error.error?.message || error.message || 'Erro desconhecido'}`);
        }
      }

      // 3) Persistência/estado
      await this.tokenStorage.setToken(response.token);
      await this.storage.set('authUser', response.user);
      this.userChanged.next(response.user);
      return response;

    } catch (error: any) {
      console.error('Erro no Apple Sign In:', error);
      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        throw new Error('Login cancelado pelo usuário.');
      } else if (error.message?.includes('not available')) {
        throw new Error('Apple Sign In não está disponível neste dispositivo.');
      } else {
        throw new Error(`Erro no Apple Sign In: ${error.message || 'Erro desconhecido'}`);
      }
    }
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
    } catch {}
    
    // Apple Sign In não tem método signOut nativo
    // O logout é feito apenas removendo os tokens locais
    
    await this.tokenStorage.removeToken();
    await this.storage.remove('authUser');
    await this.storage.remove('google_refresh_token');
    sessionStorage.clear();
    this.userChanged.next(null);
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
