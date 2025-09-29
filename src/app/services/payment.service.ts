import { App } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Stripe } from '@capacitor-community/stripe';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private deepLinkSuccess = 'regimentoapp://checkout/success';
  private deepLinkCancel  = 'regimentoapp://checkout/cancel';
  private isStripeInitialized = false;

  constructor(private http: HttpClient, private apiservice: ApiService) {
    this.initializeStripe();
    this.setupAppUrlListener();
  }

  private async initializeStripe() {
    if (this.platform !== 'web' && !this.isStripeInitialized) {
      try {
        await Stripe.initialize({
          publishableKey: environment.stripe.publishableKey,
          stripeAccount: undefined,
        });
        this.isStripeInitialized = true;
      } catch (error) {
        console.error('Erro ao inicializar Stripe:', error);
      }
    }
  }

  private setupAppUrlListener() {
    App.addListener('appUrlOpen', (event) => {
      if (!event?.url) return;
      const url = new URL(event.url);
      if (url.origin + url.pathname === this.deepLinkSuccess) {
        Browser.close();
      }
      if (url.origin + url.pathname === this.deepLinkCancel) {
        Browser.close();
      }
    });
  }

  get platform(): 'ios'|'android'|'web' {
    return Capacitor.getPlatform() as any;
  }

  async getPayments() {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiservice.baseUrl}/pagamentos`)
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pagamentos', error);
      throw error;
    }
  }


  async openBillingPortal(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{url:string}>(`${this.apiservice.baseUrl}/checkout/portal`, {})
    );
    await Browser.open({ url });
  }

  /**
   * Processa pagamento baseado na plataforma
   * Todas as plataformas: Redireciona para web (evita problemas com Stripe)
   */
  async processPayment(priceId: string): Promise<void> {
    // Usar fluxo web para todas as plataformas para evitar problemas com Stripe
    await this.processWebPayment(priceId);
  }

  /**
   * Processa pagamento via web (iOS e Web)
   * Conforme diretrizes da Apple para iOS
   */
  async processWebPayment(priceId: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<{checkout_url: string, session_id: string}>(
          `${this.apiservice.baseUrl}/checkout/processar`,
          { price_id: priceId, platform: this.platform }
        )
      );
  
      if (response.checkout_url) {
        // Para iOS, usar _blank para evitar problemas com deep links
        const windowName = this.platform === 'ios' ? '_blank' : '_self';
        await Browser.open({ 
          url: response.checkout_url, 
          windowName: windowName 
        });
      }
    } catch (err) {
      const e = err as HttpErrorResponse;
      if (e.status === 409) {
        // Já possui assinatura - redirecionar para portal
        await Browser.open({ 
          url: (await firstValueFrom(this.http.post<{url:string}>(`${this.apiservice.baseUrl}/checkout/portal`, {}))).url,
          windowName: '_blank'
        });
      } else {
        // Fallback: redirecionar para página de assinatura web
        await Browser.open({ 
          url: this.webSubscriptionUrl,
          windowName: '_blank'
        });
      }
      throw err;
    }
  }

  /**
   * Processa pagamento nativo (Android)
   * Usa @capacitor-community/stripe
   */
  private async processNativePayment(priceId: string): Promise<void> {
    try {
      // Para Android, também usar o fluxo web para evitar problemas com Stripe
      console.log('Android: Redirecionando para fluxo web');
      await this.processWebPayment(priceId);
      
    } catch (error) {
      console.error('Erro ao processar pagamento nativo:', error);
      // Fallback: redirecionar para página de assinatura web
      await Browser.open({ 
        url: this.webSubscriptionUrl,
        windowName: '_blank'
      });
      throw error;
    }
  }

  /**
   * Verifica se deve usar fluxo web (todas as plataformas)
   */
  get shouldUseWebFlow(): boolean {
    return true; // Sempre usar fluxo web para evitar problemas com Stripe
  }

  /**
   * Retorna URL de assinatura web para iOS
   */
  get webSubscriptionUrl(): string {
    return environment.manageSubscriptionUrl;
  }
}
