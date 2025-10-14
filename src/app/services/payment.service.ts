import { App } from '@capacitor/app';
import { firstValueFrom, BehaviorSubject, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { HttpClient } from '@angular/common/http';
import { ApiService } from 'src/app/services/api.service';
import { StorageService } from 'src/app/services/storage.service';
import { MeAssinaturaResponse } from 'src/app/models/userModel';
import { ToastController } from '@ionic/angular';

type CheckoutResponse = { success: boolean; checkout_url: string; session_id: string };
type PortalResponse   = { url: string };
type CancelResponse   = { success: boolean; message: string; ends_at?: string };
type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
type WebhookEvent = {
  type: string;
  data: {
    object: any;
  };
  created: number;
};

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly CANCELLATION_KEY = 'user_cancelled_once';
  private readonly PAYMENT_STATUS_KEY = 'payment_status';
  private readonly WEBHOOK_EVENTS_KEY = 'webhook_events';
  
  private paymentStatusSubject = new BehaviorSubject<PaymentStatus>('pending');
  public paymentStatus$ = this.paymentStatusSubject.asObservable();

  constructor(
    private http: HttpClient, 
    private api: ApiService,
    private storage: StorageService,
    private toastController: ToastController
  ) {
    this.initializePaymentStatus();
    this.setupBrowserListeners();
  }

  async getPayments() {
    const res: any = await firstValueFrom(this.http.get(`${this.api.baseUrl}/pagamentos`));
    return res?.data ?? [];
  }

  async getMeAssinatura(): Promise<MeAssinaturaResponse> {
    const res: MeAssinaturaResponse = await firstValueFrom(
      this.http.get<MeAssinaturaResponse>(`${this.api.baseUrl}/me/assinatura`)
    );
    return res;
  }

  /**
   * Inicializa o status de pagamento a partir do storage local
   */
  private async initializePaymentStatus(): Promise<void> {
    try {
      const savedStatus = await this.storage.get(this.PAYMENT_STATUS_KEY);
      if (savedStatus) {
        this.paymentStatusSubject.next(savedStatus as PaymentStatus);
      }
    } catch (error) {
      console.error('Erro ao inicializar status de pagamento:', error);
    }
  }

  /**
   * Configura listeners para eventos do browser
   */
  private async setupBrowserListeners(): Promise<void> {
    try {
      // Listener para quando o browser é fechado
      await Browser.addListener('browserFinished', () => {
        this.handleBrowserClosed();
      });

      // Listener para quando a página do browser carrega
      await Browser.addListener('browserPageLoaded', () => {
      });

    } catch (error) {
      console.error('Erro ao configurar listeners do browser:', error);
    }
  }

  /**
   * Trata o fechamento do browser
   */
  private async handleBrowserClosed(): Promise<void> {
    try {
      // Aguardar um pouco para o backend processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar status da assinatura
      const assinatura = await this.checkSubscriptionStatus();
      
      if (assinatura) {
        await this.refreshUserData();
        
        // Mostrar feedback ao usuário
        if (assinatura.active || assinatura.status === 'active') {
          await this.showSuccessToast('Assinatura ativada com sucesso!');
        } else if (assinatura.status === 'past_due') {
          await this.showWarningToast('Pagamento pendente. Verifique seus dados.');
        }
      }
      
    } catch (error) {
      console.error('Erro ao processar fechamento do browser:', error);
      await this.showErrorToast('Erro ao verificar status da assinatura');
    }
  }

  /**
   * Atualiza o status de pagamento e notifica os observadores
   */
  private async updatePaymentStatus(status: PaymentStatus): Promise<void> {
    try {
      await this.storage.set(this.PAYMENT_STATUS_KEY, status);
      this.paymentStatusSubject.next(status);
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
    }
  }

  /**
   * Obtém o status atual de pagamento
   */
  getCurrentPaymentStatus(): PaymentStatus {
    return this.paymentStatusSubject.value;
  }

  /**
   * Processa eventos de webhook do Stripe
   */
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      // Salvar evento para auditoria
      await this.saveWebhookEvent(event);
      
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;
        default:
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      await this.showErrorToast('Erro ao processar evento de pagamento');
    }
  }

  /**
   * Salva evento de webhook para auditoria
   */
  private async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      const events = await this.storage.get(this.WEBHOOK_EVENTS_KEY) || [];
      events.push({
        ...event,
        processedAt: new Date().toISOString()
      });
      
      // Manter apenas os últimos 50 eventos
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      await this.storage.set(this.WEBHOOK_EVENTS_KEY, events);
    } catch (error) {
      console.error('Erro ao salvar evento de webhook:', error);
    }
  }

  /**
   * Trata checkout session completed
   */
  private async handleCheckoutCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data.object;
    await this.updatePaymentStatus('succeeded');
    await this.showSuccessToast('Pagamento realizado com sucesso!');
    
    // Forçar atualização dos dados do usuário
    await this.refreshUserData();
  }

  /**
   * Trata pagamento de fatura bem-sucedido
   */
  private async handlePaymentSucceeded(event: WebhookEvent): Promise<void> {
    const invoice = event.data.object;
    await this.updatePaymentStatus('succeeded');
    await this.showSuccessToast('Pagamento processado com sucesso!');
    
    await this.refreshUserData();
  }

  /**
   * Trata falha no pagamento
   */
  private async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const invoice = event.data.object;
    
    await this.updatePaymentStatus('failed');
    await this.showErrorToast('Falha no processamento do pagamento. Verifique seus dados.');
    
    await this.refreshUserData();
  }

  /**
   * Trata atualização de assinatura
   */
  private async handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object;
    
    await this.refreshUserData();
  }

  /**
   * Trata cancelamento de assinatura
   */
  private async handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const subscription = event.data.object;
    
    await this.updatePaymentStatus('cancelled');
    await this.showWarningToast('Sua assinatura foi cancelada.');
    
    await this.refreshUserData();
  }

  /**
   * Força atualização dos dados do usuário após mudanças de pagamento
   */
  private async refreshUserData(): Promise<void> {
    try {
      // Emitir evento para que outros componentes possam reagir
      window.dispatchEvent(new CustomEvent('paymentStatusChanged'));
      
      // Opcional: forçar refresh dos dados de assinatura
      // Isso pode ser útil se o backend não notificar automaticamente
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('forceRefreshUserData'));
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  }

  /**
   * Verifica o status atual da assinatura do usuário
   * Útil para verificar se o pagamento foi processado
   */
  async checkSubscriptionStatus(): Promise<MeAssinaturaResponse | null> {
    try {
      const assinatura = await this.getMeAssinatura();
      
      if (assinatura?.status) {
        
        // Atualizar status baseado no status da assinatura
        if (assinatura.status === 'active' || assinatura.active) {
          await this.updatePaymentStatus('succeeded');
        } else if (assinatura.status === 'canceled' || assinatura.will_cancel) {
          await this.updatePaymentStatus('cancelled');
        } else if (assinatura.status === 'past_due') {
          await this.updatePaymentStatus('failed');
        }
      }
      
      return assinatura;
    } catch (error) {
      console.error('Erro ao verificar status da assinatura:', error);
      return null;
    }
  }

  /**
   * Mostra toast de sucesso
   */
  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle'
    });
    await toast.present();
  }

  /**
   * Mostra toast de erro
   */
  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color: 'danger',
      position: 'top',
      icon: 'alert-circle'
    });
    await toast.present();
  }

  /**
   * Mostra toast de aviso
   */
  private async showWarningToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'warning',
      position: 'top',
      icon: 'warning'
    });
    await toast.present();
  }

  /**
   * Inicia Stripe Checkout (assinatura) e abre a URL hospedada pela Stripe.
   * O backend cria a sessão e processa tudo via webhook automaticamente.
   * Não precisamos mais de deeplinks - apenas abrir o navegador e aguardar webhook.
   */
  async startCheckout(priceId: string, platform: 'ios'|'android' = this.detectPlatform()) {
    try {
      await this.updatePaymentStatus('processing');
  
      const res = await firstValueFrom(
        this.http.post<CheckoutResponse>(`${this.api.baseUrl}/checkout/processar`, {
          price_id: priceId,
          platform,
        })
      );
  
      if (!res?.success || !res?.checkout_url) {
        await this.updatePaymentStatus('failed');
        throw new Error('Erro ao processar pagamento');
      }
      
      // Abrir navegador web - o Stripe processará tudo e enviará webhook
      await Browser.open({
        url: res.checkout_url,
        presentationStyle: 'fullscreen',
      });
  
    } catch (error) {
      await this.updatePaymentStatus('failed');
      console.error('❌ Erro ao iniciar checkout:', error);
      throw error;
    }
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
   * Verifica se o usuário já cancelou uma assinatura anteriormente
   */
  async hasUserCancelledOnce(): Promise<boolean> {
    try {
      const hasCancelled = await this.storage.get(this.CANCELLATION_KEY);
      return hasCancelled === true;
    } catch (error) {
      console.error('Erro ao verificar histórico de cancelamento:', error);
      return false;
    }
  }

  /**
   * Marca que o usuário já cancelou uma vez
   */
  private async markUserAsCancelled(): Promise<void> {
    try {
      await this.storage.set(this.CANCELLATION_KEY, true);
    } catch (error) {
      console.error('Erro ao marcar cancelamento:', error);
    }
  }

  /**
   * Cancela assinatura no fim do período.
   * Verifica se o usuário já cancelou uma vez antes de permitir o cancelamento.
   */
  async cancelSubscription() {
    // Verificar se o usuário já cancelou uma vez
    const hasCancelledOnce = await this.hasUserCancelledOnce();
    
    if (hasCancelledOnce) {
      throw new Error('Você já cancelou sua assinatura uma vez. Não é possível cancelar novamente.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<CancelResponse>(`${this.api.baseUrl}/checkout/cancelar`, {})
      );

      // Se o cancelamento foi bem-sucedido, marcar que o usuário já cancelou uma vez
      if (response?.success) {
        await this.markUserAsCancelled();
      }

      return response;
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
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
   * Método removido: processStripeDeepLink
   * 
   * Com a evolução do backend, não precisamos mais processar deeplinks.
   * O Stripe agora processa tudo via webhook automaticamente:
   * 1. Usuário completa pagamento no navegador
   * 2. Stripe envia webhook para o backend
   * 3. Backend processa e atualiza usuário automaticamente
   * 4. Frontend recebe atualização via eventos de mudança de status
   */

  /**
   * Obtém eventos de webhook salvos para auditoria/debug
   */
  async getWebhookEvents(): Promise<any[]> {
    try {
      return await this.storage.get(this.WEBHOOK_EVENTS_KEY) || [];
    } catch (error) {
      console.error('Erro ao obter eventos de webhook:', error);
      return [];
    }
  }

  /**
   * Limpa eventos de webhook salvos
   */
  async clearWebhookEvents(): Promise<void> {
    try {
      await this.storage.remove(this.WEBHOOK_EVENTS_KEY);
    } catch (error) {
      console.error('Erro ao limpar eventos de webhook:', error);
    }
  }

  /**
   * Obtém logs de pagamento para debug
   */
  async getPaymentLogs(): Promise<any> {
    try {
      const status = await this.storage.get(this.PAYMENT_STATUS_KEY);
      const events = await this.getWebhookEvents();
      
      return {
        currentStatus: status,
        webhookEvents: events,
        lastEvent: events.length > 0 ? events[events.length - 1] : null
      };
    } catch (error) {
      console.error('Erro ao obter logs de pagamento:', error);
      return null;
    }
  }

  private detectPlatform(): 'ios' | 'android' {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'android';
    // Se quiser, dá para usar Capacitor.getPlatform(), mas para webviews o UA costuma bastar.
  }

  /**
   * Limpa todos os listeners do browser
   * Deve ser chamado quando o serviço for destruído
   */
  async cleanup(): Promise<void> {
    try {
      await Browser.removeAllListeners();
    } catch (error) {
      console.error('Erro ao limpar listeners do browser:', error);
    }
  }
}
