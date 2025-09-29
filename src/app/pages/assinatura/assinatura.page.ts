import { Component } from '@angular/core';
import { PaymentService, AssinaturaStatus } from '../../services/payment.service';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-assinatura',
  templateUrl: './assinatura.page.html',
  styleUrls: ['./assinatura.page.scss'],
})
export class AssinaturaPage {
  loading = false;
  msg = '';
  status: AssinaturaStatus | null = null;

  readonly PRICE_MENSAL = environment.stripePrices.mensal;
  readonly PRICE_ANUAL  = environment.stripePrices.anual;

  // iOS (Brasil) => reader + ELA
  get isIOS(): boolean { return Capacitor.getPlatform() === 'ios'; }
  get isReaderMode(): boolean { return true; } // deixe true; ou mova para env/flag
  get hideInAppPurchase(): boolean { return this.isIOS && this.isReaderMode; }

  // Conveniências de estado
  get isActive(): boolean {
    return (this.status?.active ?? false) || this.status?.status === 'active' || this.status?.status === 'trialing';
  }
  get planName(): string { return (this.status?.plan || '').toLowerCase(); }
  get isMensal(): boolean { return /mensal/.test(this.planName); }
  get isAnual(): boolean  { return /anual/.test(this.planName); }
  get willCancel(): boolean { return !!this.status?.will_cancel && this.isActive; }
  get endsAtFmt(): string | null {
    return this.status?.ends_at ? new Date(this.status.ends_at).toLocaleDateString() : null;
  }



  // Pode mostrar CTAs de compra no app?
  // - Nunca no iOS reader
  // - Em Android/Web só se NÃO estiver ativo
  get showPurchaseCtas(): boolean {
    if (this.hideInAppPurchase) return false; // iOS reader
    return !this.isActive;                     // <- ativo (mesmo willCancel) = não mostra
  }

  // Pode mostrar "migrar"?
  get showMigrate(): boolean {
    // Só faz sentido se já estiver ativo E houver outro plano disponível
    if (!this.isActive) return false;
    return true; // vamos lidar com os botões de destino no template
  }

  constructor(private pay: PaymentService) {}

  async ionViewWillEnter() { await this.verStatus(); }

  // Protege contra chamar "assinar" estando ativo
  private guardAlreadyActive(): boolean {
    if (this.isActive) {
      this.msg = 'Você já possui uma assinatura ativa. Migre de plano ou cancele antes de assinar novamente.';
      return true;
    }
    return false;
  }

  async assinarMensal() {
    if (this.guardAlreadyActive()) return;
    await this.assinar(this.PRICE_MENSAL);
  }

  async assinarAnual()  {
    if (this.guardAlreadyActive()) return;
    await this.assinar(this.PRICE_ANUAL);
  }

  private async assinar(priceId: string) {
    this.loading = true; this.msg = 'Redirecionando para checkout seguro…';
    try {
      const st = await this.pay.startSubscription(priceId);
      this.status = st;
      this.msg = st.active ? 'Assinatura ativa ✅' : `Status: ${st.status}`;
    } catch (e: any) {
      this.msg = e?.message ?? 'Falha ao processar assinatura.';
    } finally {
      this.loading = false;
    }
  }

  async verStatus() {
    this.loading = true;
    try {
      this.status = await this.pay.getSubscriptionStatus();
      this.msg = this.status?.active ? 'Assinatura ativa' : (this.status?.status ?? 'Sem assinatura');
    } finally { this.loading = false; }
  }

  // Migrações (troca de plano)
  async migrarParaAnual() {
    if (!this.isActive || this.isAnual) return;
    this.loading = true; this.msg = 'Migrando para o plano anual…';
    try {
      const r = await this.pay.updatePlan(this.PRICE_ANUAL);
      this.msg = r.message;
      await this.verStatus();
    } finally { this.loading = false; }
  }

  async migrarParaMensal() {
    if (!this.isActive || this.isMensal) return;
    this.loading = true; this.msg = 'Migrando para o plano mensal…';
    try {
      const r = await this.pay.updatePlan(this.PRICE_MENSAL);
      this.msg = r.message;
      await this.verStatus();
    } finally { this.loading = false; }
  }

  async cancelar() {
    this.loading = true; this.msg = 'Cancelando…';
    try {
      const r = await this.pay.cancelSubscription();
      this.msg = r.message;
      await this.verStatus();
    } finally { this.loading = false; }
  }

  async portal() { await this.pay.openBillingPortal(); }
  async gerenciarNoSite() { await this.pay.openExternalManage(); }
}
