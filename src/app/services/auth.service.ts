import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Capacitor } from '@capacitor/core';
import { HttpClient } from '@angular/common/http';
import { UserModel, ProfileResponse, SubscriptionInfo, PlanInfo } from 'src/app/models/userModel';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { TokenStorageService } from './token-storage.service';
import { StorageService } from './storage.service';
import { GenericOAuth2 } from '@capacitor-community/generic-oauth2';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

@Injectable({ providedIn: 'root' })
export class AuthService {
  userChanged = new BehaviorSubject<UserModel | null>(null);
  private isAppleLoginInProgress = false;

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

  /**
   * Obtém dados completos do perfil (user, subscription, plan_info)
   */
  async getProfileData(): Promise<ProfileResponse | null> {
    return await this.storage.get<ProfileResponse>('profileData');
  }

  /**
   * Obtém dados da assinatura
   */
  async getSubscriptionData(): Promise<SubscriptionInfo | null> {
    return await this.storage.get<SubscriptionInfo>('subscriptionData');
  }

  /**
   * Obtém informações do plano
   */
  async getPlanInfoData(): Promise<PlanInfo | null> {
    return await this.storage.get<PlanInfo>('planInfoData');
  }

  async getAuthToken(): Promise<string | null> {
    return this.tokenStorage.getToken();
  }

  private decodeJwt<T = any>(jwt: string): T | null {
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
      return await firstValueFrom(
        this.http.post(`${this.apiService.baseUrl}/register`, user)
      );
    } catch (e: any) {
      throw e?.error ?? { message: 'Erro inesperado.' };
    }
  }

  async fetchProfile(): Promise<ProfileResponse> {
    if (!(await this.isTokenValid())) {
      await this.logout();
      throw new Error('Token expirado');
    }

    try {
      const response: ProfileResponse = await firstValueFrom(
        this.http.get<ProfileResponse>(`${this.apiService.baseUrl}/profile`)
      );
      
      // Armazenar dados completos no storage
      await this.storage.set('profileData', response);
      await this.storage.set('subscriptionData', response.subscription);
      await this.storage.set('planInfoData', response.plan_info);
      
      return response;
    } catch (error: any) {
      if (error.status === 401) {
        await this.logout();
      }
      throw new Error('Erro ao buscar perfil do usuário.');
    }
  }

  /**
   * Sincroniza o perfil do usuário com o servidor e atualiza o storage local
   * Útil para manter dados atualizados após mudanças de assinatura
   */
  async syncUserProfile(): Promise<UserModel | null> {
    try {
      
      // Verificar se o token é válido
      if (!(await this.isTokenValid())) {
        await this.logout();
        return null;
      }

      // Buscar perfil atualizado do servidor
      const response: ProfileResponse = await firstValueFrom(
        this.http.get<ProfileResponse>(`${this.apiService.baseUrl}/profile`)
      );
      
      if (response?.user) {
        // Atualizar storage local com dados mais recentes
        await this.storage.set('authUser', response.user);
        await this.storage.set('profileData', response);
        await this.storage.set('subscriptionData', response.subscription);
        await this.storage.set('planInfoData', response.plan_info);
        
        // Notificar mudanças para outros componentes
        this.userChanged.next(response.user);
        return response.user;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Erro ao sincronizar perfil:', error);
      
      if (error.status === 401) {
        await this.logout();
      }
      
      throw new Error('Erro ao sincronizar perfil do usuário.');
    }
  }

  /**
   * Obtém o usuário atual, tentando sincronizar se necessário
   * @param forceSync - Força sincronização mesmo se dados locais existirem
   */
  async getCurrentUser(forceSync: boolean = false): Promise<UserModel | null> {
    try {
      // Se não forçar sync, tentar usar dados locais primeiro
      if (!forceSync) {
        const localUser = await this.getUser();
        if (localUser) {
          return localUser;
        }
      }

      // Sincronizar com servidor
      return await this.syncUserProfile();
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      // Fallback para dados locais em caso de erro
      return await this.getUser();
    }
  }

  /**
   * Sincroniza automaticamente o perfil em background
   * Útil para manter dados atualizados sem interromper a UX
   */
  async syncProfileInBackground(): Promise<void> {
    try {
      if (!(await this.isTokenValid())) {
        return;
      }
      await this.syncUserProfile();
    } catch (error) {
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
      const googleIdToken = result?.credential?.idToken; // ✅ preferido
      const googleAccessTok = result?.credential?.accessToken; // fallback

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
            { token: tokenForBackend }, // 👈 NADA de getIdToken() do Firebase aqui
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            }
          )
        );
      } catch (error: any) {
        console.error('Erro na requisição para o backend (Android):', error);
        if (error.status === 0) {
          throw new Error(
            'Erro de conectividade. Verifique sua conexão com a internet.'
          );
        } else if (error.status === 401) {
          throw new Error('Token inválido ou expirado.');
        } else if (error.status >= 500) {
          throw new Error(
            'Erro interno do servidor. Tente novamente mais tarde.'
          );
        } else if (error.name === 'TimeoutError') {
          throw new Error('Timeout na requisição. Tente novamente.');
        } else {
          throw new Error(
            `Erro na autenticação: ${
              error.error?.message || error.message || 'Erro desconhecido'
            }`
          );
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
      appId:
        '202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q.apps.googleusercontent.com', // iOS client ID específico
      authorizationBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      accessTokenEndpoint: 'https://oauth2.googleapis.com/token',
      resourceUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: 'openid email profile',
      redirectUrl:
        'com.googleusercontent.apps.202495948548-is3ea3s3tmcv3956m6oe24eqfod5458q:/oauth2redirect',
      responseType: 'code',
      pkceEnabled: true,
      logsEnabled: true,
      additionalParameters: { access_type: 'offline', prompt: 'consent' }, // garante refresh_token na 1ª vez
    } as const;

    // Silent refresh (se tiver)
    const storedRefresh = await this.storage.get<string>(
      'google_refresh_token'
    );
    if (storedRefresh) {
      const body = new URLSearchParams({
        client_id: config.appId,
        grant_type: 'refresh_token',
        refresh_token: storedRefresh,
      });
      try {
        const refreshed: any = await firstValueFrom(
          this.http.post(config.accessTokenEndpoint, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
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
        throw new Error('Não foi possível obter o access_token no iOS');
      }
    }

    // Fluxo interativo
    let result: any;
    try {
      result = await GenericOAuth2.authenticate(config);
    } catch (error: any) {
      console.error('Erro no GenericOAuth2.authenticate:', error);
      throw new Error(
        `Erro na autenticação OAuth2: ${error.message || 'Erro desconhecido'}`
      );
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
              Accept: 'application/json',
            },
          }
        )
      );
    } catch (error: any) {
      console.error('Erro na requisição para o backend:', error);
      if (error.status === 0) {
        throw new Error(
          'Erro de conectividade. Verifique sua conexão com a internet.'
        );
      } else if (error.status === 401) {
        throw new Error('Token inválido ou expirado.');
      } else if (error.status >= 500) {
        throw new Error(
          'Erro interno do servidor. Tente novamente mais tarde.'
        );
      } else if (error.name === 'TimeoutError') {
        throw new Error('Timeout na requisição. Tente novamente.');
      } else {
        throw new Error(
          `Erro na autenticação: ${
            error.error?.message || error.message || 'Erro desconhecido'
          }`
        );
      }
    }

    await this.tokenStorage.setToken(response.token);
    await this.storage.set('authUser', response.user);
    this.userChanged.next(response.user);
    return response;
  }

  /**
   * Apple Sign In apenas para iOS - versão simplificada para evitar loops
   */
  async appleLogin(): Promise<any> {
    const platform = Capacitor.getPlatform();
    if (platform !== 'ios') {
      throw new Error('Apple Sign In disponível somente em iOS.');
    }

    // Flag para evitar múltiplas chamadas simultâneas
    if (this.isAppleLoginInProgress) {
      throw new Error('Apple Sign-In já está em andamento. Aguarde...');
    }

    this.isAppleLoginInProgress = true;

    try {
      // Usar apenas o método simples para evitar loops
      const result = await this.appleLoginSimple();
      this.isAppleLoginInProgress = false;
      return result;
    } catch (error: any) {
      this.isAppleLoginInProgress = false;
      console.error('Apple Sign-In falhou:', error);
      throw new Error(
        `Apple Sign-In falhou: ${error.message || 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Apple Sign-In com configuração seguindo documentação oficial
   */
  private async appleLoginSimple(): Promise<any> {
    const options = {
      clientId: 'com.regimento.appservice',
      redirectURI:
        'https://regimento-interno-comentado.firebaseapp.com/__/auth/handler',
      scopes: 'email name',
      state: '12345',
      nonce: this.generateNonce(),
    };

    try {
      // Adicionar timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Apple Sign-In timeout após 30 segundos')),
          30000
        );
      });

      const result = (await Promise.race([
        SignInWithApple.authorize(options),
        timeoutPromise,
      ])) as any;

      if (!result.response) {
        throw new Error('Resposta do Apple Sign-In está vazia.');
      }

      // Extrair dados da resposta
      const {
        identityToken,
        authorizationCode,
        user,
        email,
        givenName,
        familyName,
      } = result.response;

      if (!identityToken) {
        throw new Error(
          'Token de identidade não foi retornado pelo Apple Sign-In.'
        );
      }

      // Extrair email do identityToken se não estiver disponível na resposta
      let userEmail = email;
      if (!userEmail && identityToken) {
        try {
          const tokenPayload = this.decodeJwt(identityToken);
          userEmail = tokenPayload?.email || null;
        } catch (error) {
          console.warn(
            'Não foi possível extrair email do identityToken:',
            error
          );
        }
      }

      // Construir nome completo se disponível
      let fullName: string | undefined;
      if (givenName || familyName) {
        fullName = [givenName, familyName].filter(Boolean).join(' ');
      }

      // Enviar para backend usando uma abordagem alternativa
      // Como o backend não consegue processar o identityToken do Apple,
      // vamos enviar os dados essenciais de forma que o backend possa processar
      const backendData = {
        // Enviar o token para validação (se o backend conseguir)
        token: identityToken,
        // Dados essenciais extraídos do token
        email: userEmail,
        name: fullName,
        user_id: user,
        provider: 'apple',
        client: 'apple_native',
        // Dados adicionais para compatibilidade
        authorizationCode: authorizationCode,
        // Informações do token para debug
        token_info: {
          iss: 'https://appleid.apple.com',
          aud: 'com.regimento.app',
          sub: user,
          email: userEmail,
          email_verified: true,
          is_private_email: true,
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora a partir de agora
        },
      };

      const response: any = await firstValueFrom(
        this.http.post(
          `${this.apiService.baseUrl}/auth/social-login/apple`,
          backendData,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        )
      );

      // Persistência local
      await this.tokenStorage.setToken(response.token);
      await this.storage.set('authUser', response.user);
      this.userChanged.next(response.user);
      return response;
    } catch (error: any) {
      console.error('Erro no Apple Sign-In simples:', error);

      // Tratamento específico de erros
      if (error.message?.includes('timeout')) {
        throw new Error(
          'Apple Sign-In demorou muito para responder. Tente novamente.'
        );
      } else if (
        error.message?.includes('cancelled') ||
        error.message?.includes('canceled')
      ) {
        throw new Error('Login com Apple foi cancelado pelo usuário.');
      } else if (error.status === 401) {
        throw new Error('Token inválido ou expirado. Tente novamente.');
      } else if (error.status >= 500) {
        throw new Error(
          'Erro interno do servidor. Tente novamente mais tarde.'
        );
      } else {
        throw new Error(
          `Erro no Apple Sign-In: ${error.message || 'Erro desconhecido'}`
        );
      }
    }
  }

  /**
   * Gera um nonce aleatório para o Apple Sign-In
   */
  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
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
    
    // Limpar dados de assinatura e planos que podem estar em cache
    await this.storage.remove('assinaturaData');
    await this.storage.remove('plansData');
    await this.storage.remove('userSubscription');
    await this.storage.remove('profileData');
    await this.storage.remove('subscriptionData');
    await this.storage.remove('planInfoData');
    
    sessionStorage.clear();
    this.userChanged.next(null);
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /**
   * Verificar se o usuário pode editar dados (não é Apple)
   */
  async canEditProfile(): Promise<boolean> {
    const user = await this.getUser();
    if (!user) return false;

    // Usuários Apple não podem editar dados
    return (
      user.provider !== 'apple' &&
      user.provider !== 'apple_native' &&
      user.provider !== 'apple_simple'
    );
  }

  /**
   * Verificar se o usuário pode excluir conta
   */
  async canDeleteAccount(): Promise<boolean> {
    const user = await this.getUser();
    if (!user) return false;

    // Todos os usuários podem excluir conta, mas com avisos diferentes
    return true;
  }
}
