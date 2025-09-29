import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

export type AssinaturaStatus = {
  active: boolean;
  status: 'active'|'trialing'|'canceled'|'incomplete'|'past_due'|'unpaid'|null;
  ends_at?: string|null;             // quando está agendado pra encerrar
  plan?: string|null;
  will_cancel?: boolean;             // novo
  current_period_end?: string|null;  // novo
};

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient, private apiservice: ApiService) {}

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

  async startSubscription(priceId: string): Promise<AssinaturaStatus> {
    const create = await firstValueFrom(
      this.http.post<{success:boolean; checkout_url:string; session_id:string}>(
        `${this.apiservice.baseUrl}/checkout/processar`,
        { price_id: priceId, platform: this.platform }
      )
    );
    if (!create?.success || !create?.checkout_url) {
      throw new Error('Falha ao criar sessão de checkout.');
    }
    await Browser.open({ url: create.checkout_url });
    return this.waitForDeepLinkAndFetchStatus();
  }

  private waitForDeepLinkAndFetchStatus(): Promise<AssinaturaStatus> {
    return new Promise(async (resolve, reject) => {
      let done = false;
      const handler = async () => {
        try { await Browser.close(); } catch {}
        try {
          const st = await this.getSubscriptionStatus();
          done = true; resolve(st);
        } catch (e) {
          done = true; reject(e);
        } finally {
          App.removeAllListeners();
        }
      };
      await App.addListener('appUrlOpen', handler);
      setTimeout(async () => {
        if (done) return;
        try {
          const st = await this.getSubscriptionStatus();
          done = true; resolve(st);
        } catch (e) {
          done = true; reject(e);
        } finally {
          App.removeAllListeners();
        }
      }, 5000);
    });
  }

  async getSubscriptionStatus(): Promise<AssinaturaStatus> {
    return firstValueFrom(this.http.get<AssinaturaStatus>(`${this.apiservice.baseUrl}/me/assinatura`));
  }

  async openBillingPortal(): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.post<{url:string}>(`${this.apiservice.baseUrl}/checkout/portal`, {})
    );
    await Browser.open({ url });
  }

  async updatePlan(priceId: string) {
    return firstValueFrom(
      this.http.post<{success:boolean; message:string}>(`${this.apiservice.baseUrl}/checkout/atualizar`, { price_id: priceId })
    );
  }

  async cancelSubscription() {
    return firstValueFrom(
      this.http.post<{success:boolean; message:string}>(`${this.apiservice.baseUrl}/checkout/cancelar`, {})
    );
  }

  // 👉 botão “Gerenciar assinatura no site” (fluxo ELA/reader)
  async openExternalManage(): Promise<void> {
    await Browser.open({ url: environment.manageSubscriptionUrl }); // ex.: https://regimentocd.com.br/assinatura
  }
}
