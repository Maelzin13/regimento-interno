import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  /**
   * Obtém configuração do Firebase de forma segura
   */
  getFirebaseConfig() {
    return {
      apiKey: environment.firebase.apiKey,
      authDomain: environment.firebase.authDomain,
      projectId: environment.firebase.projectId,
      storageBucket: environment.firebase.storageBucket,
      messagingSenderId: environment.firebase.messagingSenderId,
      appId: environment.firebase.appId,
      measurementId: environment.firebase.measurementId,
    };
  }

  /**
   * Obtém configuração do Google OAuth de forma segura
   */
  getGoogleOAuthConfig() {
    return {
      clientId: environment.googleOAuth.clientId,
      serverClientId: environment.googleOAuth.serverClientId,
    };
  }

  /**
   * Obtém URL base da API de forma segura
   */
  getApiBaseUrl(): string {
    return environment.baseUrl;
  }

  /**
   * Verifica se as configurações estão completas
   */
  validateConfig(): { isValid: boolean; missingKeys: string[] } {
    const missingKeys: string[] = [];
    
    // Verificar Firebase
    if (!environment.firebase.apiKey) missingKeys.push('FIREBASE_API_KEY');
    if (!environment.firebase.authDomain) missingKeys.push('FIREBASE_AUTH_DOMAIN');
    if (!environment.firebase.projectId) missingKeys.push('FIREBASE_PROJECT_ID');
    if (!environment.firebase.storageBucket) missingKeys.push('FIREBASE_STORAGE_BUCKET');
    if (!environment.firebase.messagingSenderId) missingKeys.push('FIREBASE_MESSAGING_SENDER_ID');
    if (!environment.firebase.appId) missingKeys.push('FIREBASE_APP_ID');
    
    // Verificar Google OAuth
    if (!environment.googleOAuth.clientId) missingKeys.push('GOOGLE_OAUTH_CLIENT_ID');
    if (!environment.googleOAuth.serverClientId) missingKeys.push('GOOGLE_SERVER_CLIENT_ID');
    
    // Verificar API
    if (!environment.baseUrl) missingKeys.push('API_BASE_URL');
    
    return {
      isValid: missingKeys.length === 0,
      missingKeys
    };
  }

  /**
   * Log de configuração (sem expor dados sensíveis)
   */
  logConfigStatus(): void {
    this.validateConfig();
  }
}
