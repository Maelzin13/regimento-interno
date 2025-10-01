import { App } from '@capacitor/app';
import { firstValueFrom } from 'rxjs';
import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'src/app/services/api.service';

type CheckoutResponse = { success: boolean; checkout_url: string; session_id: string };
type PortalResponse   = { url: string };
type CancelResponse   = { success: boolean; message: string; ends_at?: string };

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private deepLinkHandler = false;

  constructor(private http: HttpClient, private api: ApiService) {}

  async getPayments() {
    const res: any = await firstValueFrom(this.http.get(`${this.api.baseUrl}/pagamentos`));
    return res?.data ?? [];
  }

  async getMeAssinatura() {
    const res = await firstValueFrom(this.http.get(`${this.api.baseUrl}/me/assinatura`));
    return res;
  }

  /**
   * Inicia Stripe Checkout (assinatura) e abre a URL hospedada pela Stripe.
   * O backend já cria a sessão e usa deep links: regimento://checkout/success|cancel
   */
  async startCheckout(priceId: string, platform: 'ios' | 'android' = this.detectPlatform()) {
    const res = await firstValueFrom(
      this.http.post<CheckoutResponse>(`${this.api.baseUrl}/checkout/processar`, {
        price_id: priceId,
        platform,
      })
    );

    if (!res?.success || !res?.checkout_url) {
      throw new Error('Erro ao processar pagamento');
    }

    this.ensureDeepLinkListener();
    // Dica: _self evita abrir em outra aba no WebView
    await Browser.open({ url: res.checkout_url, windowName: '_self' });
  }

  /**
   * Atualiza o plano (mensal <-> anual) conforme regras do backend.
   */
  async updatePlan(priceId: string) {
    return await firstValueFrom(
      this.http.post<{ success: boolean; message: string; valorCobrado?: number }>(
        `${this.api.baseUrl}/checkout/atualizar`,
        { price_id: priceId }
      )
    );
  }

  /**
   * Cancela assinatura no fim do período.
   */
  async cancelSubscription() {
    return await firstValueFrom(
      this.http.post<CancelResponse>(`${this.api.baseUrl}/checkout/cancelar`, {})
    );
  }

  /**
   * Abre o Billing Portal (troca de cartão, ver faturas etc.)
   */
  async openBillingPortal(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<PortalResponse>(`${this.api.baseUrl}/checkout/portal`, {})
    );
    if (!url) throw new Error('Falha ao abrir o portal de faturamento.');
    await Browser.open({ url });
  }

  /**
   * Escuta os deep links: regimento://checkout/success?session_id=...
   * e regimento://checkout/cancel
   */
  private ensureDeepLinkListener() {
    if (this.deepLinkHandler) return;
    this.deepLinkHandler = true;

    App.addListener('appUrlOpen', async (event) => {
      try {
        // Ex.: regimento://checkout/success?session_id=cs_test_123
        const url = new URL(event.url);
        const path = url.host + url.pathname; // "checkout/success"
        const sessionId = url.searchParams.get('session_id') || undefined;
        

        await Browser.close().catch(() => void 0);

        if (path === 'checkout/success') {
          // Opcional: bater no /api/checkout/sucesso p/ log/telemetria
          // await firstValueFrom(this.http.get(`${this.api.baseUrl}/checkout/sucesso`, { params: { session_id: sessionId! } }));
          // Aqui você pode disparar um evento global, atualizar store ou navegar:
        }

        if (path === 'checkout/cancel') {
          console.log('[Stripe] Checkout cancelado');
        }
      } catch (error) {
        console.error('Erro ao processar deep link', error);
      }
    });
  }

  private detectPlatform(): 'ios' | 'android' {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'android';
    // Se quiser, dá para usar Capacitor.getPlatform(), mas para webviews o UA costuma bastar.
  }
}
