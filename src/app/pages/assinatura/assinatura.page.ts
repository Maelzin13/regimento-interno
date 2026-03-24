import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import {
  UserModel,
  ProfileResponse,
  SubscriptionInfo,
  PlanInfo,
  MeAssinaturaResponse,
} from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { PlansService } from 'src/app/services/plans.service';
import { PaymentService } from 'src/app/services/payment.service';
import { Plan, PlansResponse } from 'src/app/models/plan.model';
import { StorageService } from 'src/app/services/storage.service';
import { Subscription } from 'rxjs';

type Intervalo = 'Mensal' | 'Anual' | 'Free';

@Component({
  standalone: false,
  selector: 'app-assinatura',
  templateUrl: './assinatura.page.html',
  styleUrls: ['./assinatura.page.scss'],
})
export class AssinaturaPage implements OnInit, OnDestroy {
  isLoading = true;
  assinaturaAtiva: {
    ends_at: string;
    id: string;
    status: string;
  } | null = null;
  loading = false;
  isActive = false;
  allPlans: Plan[] = [];
  annualPlans: Plan[] = [];
  freePlans: Plan[] = [];
  isLoadingCancelar = false;
  monthlyPlans: Plan[] = [];
  filteredPlans: Plan[] = [];
  segment: Intervalo = 'Mensal';
  planoAtivo: Plan | null = null;
  assinaturaMe: any = null;
  currentUser: UserModel | null = null;
  plansData: PlansResponse | null = null;
  activeInterval: Intervalo | null = null;
  hasCancelledOnce: boolean = false; // Controla se o usuário já cancelou uma vez

  // Novos dados da API
  profileData: ProfileResponse | null = null;
  subscriptionData: SubscriptionInfo | null = null;
  planInfoData: PlanInfo | null = null;
  meAssinaturaData: MeAssinaturaResponse | null = null;

  private userSubscription: Subscription | null = null;
  private paymentStatusSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private pay: PaymentService,
    private toast: ToastController,
    private storage: StorageService,
    private plansService: PlansService,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    // Limpar dados anteriores antes de carregar novos dados
    this.resetPageState();

    // Escutar mudanças de usuário para limpar dados automaticamente
    this.userSubscription = this.auth.userChanged.subscribe((user) => {
      if (!user) {
        this.resetPageState();
      }
    });

    // Monitorar mudanças no status de pagamento
    this.paymentStatusSubscription = this.pay.paymentStatus$.subscribe(
      (status) => {
        this.handlePaymentStatusChange(status);
      }
    );

    // Escutar eventos de mudança de status de pagamento
    window.addEventListener('paymentStatusChanged', () => {
      this.loadUser();
      this.loadPlans();
    });

    // Escutar evento de refresh forçado de dados do usuário
    window.addEventListener('forceRefreshUserData', () => {
      this.loadUser();
      this.loadPlans();
    });

    await this.loadUser();
    await this.loadPlans();
    this.applyFilter();
  }

  /**
   * Reseta o estado da página para evitar dados de usuários anteriores
   */
  private resetPageState(): void {
    this.currentUser = null;
    this.assinaturaMe = null;
    this.assinaturaAtiva = null;
    this.plansData = null;
    this.allPlans = [];
    this.annualPlans = [];
    this.freePlans = [];
    this.monthlyPlans = [];
    this.filteredPlans = [];
    this.planoAtivo = null;
    this.isActive = false;
    this.activeInterval = null;
    this.segment = 'Mensal';
    this.loading = false;
    this.isLoadingCancelar = false;
    this.hasCancelledOnce = false;

    // Reset novos dados da API
    this.profileData = null;
    this.subscriptionData = null;
    this.planInfoData = null;
    this.meAssinaturaData = null;
  }

  // ========= helpers regras de negócio =========

  private deriveUserFlags() {
    const subscriptionStatus =
      this.subscriptionData?.stripe_status ||
      this.currentUser?.subscription_status ||
      '';
    this.isActive = ['active', 'trialing'].includes(subscriptionStatus);

    // PRIORIDADE 1: Usar dados do plan_info se disponível
    if (this.planInfoData) {
      // Verificar se é um plano Free baseado em is_free ou display_name
      if (
        this.planInfoData.is_free ||
        this.planInfoData.display_name?.toLowerCase().includes('free') ||
        this.planInfoData.name?.toLowerCase().includes('free')
      ) {
        this.activeInterval = 'Free';
      } else {
        // Se não é Free, verificar o intervalo
        const intervalo = this.planInfoData.intervalo?.toLowerCase();
        if (intervalo?.includes('mensal')) {
          this.activeInterval = 'Mensal';
        } else if (intervalo?.includes('anual')) {
          this.activeInterval = 'Anual';
        } else {
          this.activeInterval = null;
        }
      }
    } else {
      // PRIORIDADE 2: Fallback para lógica antiga usando dados do usuário
      const p = (this.currentUser?.plan || '').toLowerCase();

      if (p.includes('free') || p.includes('gratuito')) {
        this.activeInterval = 'Free';
      } else if (p.includes('mensal')) {
        this.activeInterval = 'Mensal';
      } else if (p.includes('anual')) {
        this.activeInterval = 'Anual';
      } else {
        this.activeInterval = null;
      }
    }
  }

  isPlanActive(plan: Plan): boolean {
    if (!this.isActive) return false;

    // PRIORIDADE 1: Verificar se o ID do plano corresponde ao ID da assinatura ativa
    if (this.assinaturaAtiva?.id && plan.id === this.assinaturaAtiva.id) {
      return true;
    }

    // PRIORIDADE 2: Usar dados do plan_info para comparação precisa
    if (this.planInfoData) {
      // Verificar se o plano corresponde aos dados do plan_info
      const planMatches = (
        plan.id === this.planInfoData.price_id ||
        (plan.nome === this.planInfoData.name && plan.intervalo === this.planInfoData.intervalo)
      );

      if (planMatches) {
        return true;
      }
    }

    // PRIORIDADE 3: Para planos Free, verificar se corresponde ao plano atual do usuário
    if (this.activeInterval === 'Free' && this.isPlanFree(plan)) {
      // Se temos dados do plan_info, usar para comparação
      if (this.planInfoData) {
        return plan.intervalo === this.planInfoData.intervalo;
      } else {
        // Fallback: usar dados do usuário para comparar
        const userPlan = (this.currentUser?.plan || '').toLowerCase();
        if (
          userPlan.includes('free') &&
          plan.nome.toLowerCase().includes('free')
        ) {
          // Se o usuário tem Free e o plano é Free, verificar se o intervalo coincide
          if (userPlan.includes('mensal') && plan.intervalo === 'Mensal') {
            return true;
          }
          if (userPlan.includes('anual') && plan.intervalo === 'Anual') {
            return true;
          }
        }
      }
    }

    // PRIORIDADE 4: Fallback usando heurística pelo intervalo/nome
    const u = (this.currentUser?.plan || '').toLowerCase();
    const nomeMatch = u && plan?.nome && u.includes(plan.nome.toLowerCase());
    const intervaloMatch =
      !!this.activeInterval && plan.intervalo === this.activeInterval;

    return nomeMatch || intervaloMatch;
  }

  canMigrateTo(plan: Plan): boolean {
    // Regra:
    // - Se usuário tem MENSAL ativo, pode migrar para ANUAL
    if (
      this.isActive &&
      this.activeInterval === 'Mensal' &&
      plan.intervalo === 'Anual'
    )
      return true;
    // - Se usuário tem ANUAL ativo, não migra para MENSAL (precisa cancelar antes)
    return false;
  }

  mustCancelFirst(plan: Plan): boolean {
    return (
      this.isActive &&
      this.activeInterval === 'Anual' &&
      plan.intervalo === 'Mensal'
    );
  }

  formatDate(date: any): any {
    if (!date) return '';

    // Para datas ISO com timezone, usar UTC para evitar problemas de fuso horário
    const dateObj = new Date(date);

    // Verificar se é uma data válida
    if (isNaN(dateObj.getTime())) return '';

    // Usar UTC para evitar problemas de fuso horário
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');

    return `${day}/${month}/${year}`;
  }

  // ============ carregamento ============

  private async loadUser(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Carregando...',
      spinner: 'crescent',
    });
    try {
      await loading.present();

      // Limpar dados de assinatura antes de carregar novos
      this.assinaturaMe = null;
      this.assinaturaAtiva = null;

      // Carregar dados completos do perfil usando a nova API
      this.profileData = await this.auth.fetchProfile();

      if (this.profileData) {
        this.currentUser = this.profileData.user;
        this.subscriptionData = this.profileData.subscription;
        this.planInfoData = this.profileData.plan_info;

        // Carregar dados de assinatura apenas se o usuário estiver logado
        if (this.currentUser) {
          try {
            const assinatura = await this.pay.getMeAssinatura();
            if (assinatura) {
              this.assinaturaMe = assinatura;
              this.meAssinaturaData = assinatura;
            }
          } catch (assinaturaError) {
            console.warn('Erro ao carregar assinatura:', assinaturaError);
            // Não falha o carregamento se não conseguir carregar assinatura
          }

          // Verificar se o usuário já cancelou uma vez
          await this.checkCancellationStatus();

          await this.storage.set('authUser', this.currentUser);
          this.deriveUserFlags();
        }
      }
    } catch (error) {
      await this.showToast('Erro ao carregar usuário', 'danger');
      console.error('❌ Erro ao carregar usuário:', error);
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Verifica se o usuário já cancelou uma assinatura anteriormente
   */
  private async checkCancellationStatus(): Promise<void> {
    try {
      this.hasCancelledOnce = await this.pay.hasUserCancelledOnce();
    } catch (error) {
      console.error('Erro ao verificar status de cancelamento:', error);
      this.hasCancelledOnce = false;
    }
  }

  private async loadPlans(): Promise<void> {
    this.isLoading = true;
    try {
      // Limpar dados de planos anteriores
      this.plansData = null;
      this.assinaturaAtiva = null;
      this.allPlans = [];
      this.annualPlans = [];
      this.freePlans = [];
      this.monthlyPlans = [];
      this.filteredPlans = [];
      this.planoAtivo = null;

      this.plansData = await this.plansService.getPlans();

      this.assinaturaAtiva = this.plansData.assinaturaAtiva;
      this.deriveUserFlags();

      // base para filtros
      this.allPlans = this.plansData.planos ?? [];
      this.allPlans = this.allPlans.filter((p) => p.nome !== '"myproduct"');
      // CORREÇÃO: Sempre atualizar o segmento baseado no plano ativo
      if (this.isActive && this.activeInterval) {
        this.segment = this.activeInterval;
      } else if (this.isActive && this.assinaturaAtiva?.id) {
        // Fallback: tentar determinar o segmento pelo plano ativo
        const activePlan = this.allPlans.find(
          (p) => p.id === this.assinaturaAtiva?.id
        );
        if (activePlan) {
          this.segment = activePlan.intervalo as Intervalo;
        }
      }

      this.monthlyPlans = this.allPlans.filter(
        (p) =>
          p.intervalo === 'Mensal' && p.nome !== 'Free' && p.preco !== 'R$ 0,00'
      );

      this.annualPlans = this.allPlans.filter(
        (p) =>
          p.intervalo === 'Anual' && p.nome !== 'Free' && p.preco !== 'R$ 0,00'
      );

      // Filtrar planos Free
      const freePlansFiltered = this.allPlans.filter(
        (p) =>
          p.nome === 'Free' ||
          p.preco === 'R$ 0,00'
      );

      // Remover duplicatas baseado no ID do plano
      this.freePlans = freePlansFiltered.filter(
        (plan, index, self) => index === self.findIndex((p) => p.id === plan.id)
      );

      // Se o usuário tem um plano Free ativo, mostrar apenas o plano ativo
      if (
        this.isActive &&
        this.activeInterval === 'Free' &&
        this.freePlans.length > 1
      ) {
        // Tentar encontrar o plano ativo primeiro
        const activePlan = this.freePlans.find((plan) =>
          this.isPlanActive(plan)
        );

        if (activePlan) {
          // Se encontrou o plano ativo, mostrar apenas ele
          this.freePlans = [activePlan];
        } else {
          // Se não encontrou o plano ativo, tentar deduzir pelo plan_info
          if (this.planInfoData?.price_id) {
            const planByPriceId = this.freePlans.find(
              (plan) => plan.id === this.planInfoData?.price_id
            );
            if (planByPriceId) {
              this.freePlans = [planByPriceId];
            }
          }
        }
      }
      // se sua API um dia enviar o plano ativo como objeto, já guardamos:
      this.planoAtivo = this.plansData.planoAtivo ?? null;
    } catch (error) {
      await this.showToast('Erro ao carregar planos', 'danger');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    switch (this.segment) {
      case 'Anual':
        this.filteredPlans = [...this.annualPlans];
        break;
      case 'Free':
        this.filteredPlans = [...this.freePlans];
        break;
      case 'Mensal':
      default:
        this.filteredPlans = [...this.monthlyPlans];
        break;
    }
  }

  filtrar() {
    this.applyFilter();
  }
  // ============ ações ============

  fecharModal() {
    this.router.navigate(['/home/menu']);
  }

  async portal() {
    try {
      await this.pay.openBillingPortal();
    } catch (e) {
      await this.showToast('Falha ao abrir o Portal de Faturamento', 'danger');
      console.error(e);
    }
  }

  async cancelar() {
    // Verificar se o usuário já cancelou uma vez
    if (this.hasCancelledOnce) {
      await this.showToast(
        'Você já cancelou sua assinatura uma vez. Não é possível cancelar novamente.',
        'warning'
      );
      return;
    }

    this.isLoadingCancelar = true;
    try {
      const res = await this.pay.cancelSubscription();
      if (res?.success) {
        await this.showToast(res.message || 'Cancelamento agendado', 'success');

        // Atualizar o status local de cancelamento
        this.hasCancelledOnce = true;

        // Forçar sincronização para obter dados atualizados após cancelamento
        await this.loadUser();
        await this.loadPlans();
        this.applyFilter();
      } else {
        await this.showToast(
          res?.message || 'Não foi possível cancelar',
          'warning'
        );
      }
    } catch (e: any) {
      const errorMessage =
        e?.message || e?.error?.message || 'Erro ao cancelar assinatura';
      await this.showToast(errorMessage, 'danger');
      console.error('❌ Erro ao cancelar assinatura:', e);
    } finally {
      this.isLoadingCancelar = false;
    }
  }

  async assinar(priceId: string) {
    if (this.isActive) {
      await this.showToast('Você já possui assinatura ativa.', 'warning');
      return;
    }
    try {
      this.loading = true;

      // Iniciar checkout - abre navegador web
      await this.pay
        .startCheckout(priceId)
        .then(async () => {
          this.resetPageState();

          this.userSubscription = this.auth.userChanged.subscribe((user) => {
            if (!user) {
              this.resetPageState();
            }
          });

          // Monitorar mudanças no status de pagamento
          this.paymentStatusSubscription = this.pay.paymentStatus$.subscribe(
            (status) => {
              this.handlePaymentStatusChange(status);
            }
          );

          window.addEventListener('paymentStatusChanged', () => {
            this.loadUser();
            this.loadPlans();
          });

          // Escutar evento de refresh forçado de dados do usuário
          window.addEventListener('forceRefreshUserData', () => {
            this.loadUser();
            this.loadPlans();
          });

          await this.loadUser();
          await this.loadPlans();
          this.applyFilter();
          this.loading = false;
        })
        .catch((error) => {
          this.loading = false;
          console.error('❌ Erro ao iniciar checkout:', error);
        });

      // Mostrar mensagem informativa
      await this.showToast('Redirecionando para pagamento...', 'success');

      // O status será atualizado automaticamente via webhook quando o pagamento for concluído
      // Não precisamos mais forçar sincronização imediata
    } catch (e: any) {
      await this.showToast(
        e?.error?.message || 'Erro ao iniciar checkout',
        'danger'
      );
      console.error('❌ Erro ao iniciar checkout:', e);
    } finally {
      this.loading = false;
    }
  }

  async migrar(priceId: string) {
    // só permite MENSAL -> ANUAL
    if (!(this.isActive && this.activeInterval === 'Mensal')) {
      await this.showToast(
        'Migração indisponível para seu plano atual.',
        'warning'
      );
      return;
    }
    try {
      this.loading = true;
      const res = await this.pay.updatePlan(priceId);
      if (res?.success) {
        await this.showToast(res.message || 'Plano atualizado.', 'success');
        await this.loadUser();
        await this.loadPlans();
        this.applyFilter();
      } else {
        await this.showToast(
          res?.message || 'Não foi possível atualizar o plano',
          'warning'
        );
      }
    } catch (e: any) {
      await this.showToast(
        e?.error?.message || 'Erro ao atualizar o plano',
        'danger'
      );
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  // ============ UI helpers ============
  showAssinar(plan: Plan): boolean {
    if (this.isPlanActive(plan)) return false; // nunca mostra se é o ativo
    if (this.isActive) return false; // usuário já tem assinatura ativa
    if (this.isPlanFree(plan)) return false; // planos free não mostram botão assinar
    return true; // usuário sem assinatura -> pode assinar
  }

  isPlanFree(plan: Plan): boolean {
    return (
      plan.nome === 'Free' ||
      plan.preco === 'R$ 0,00'
    );
  }

  async ativarPlanoFree(planId: string) {
    this.loading = true;
    try {
      // Iniciar checkout - abre navegador web
      await this.pay.startCheckout(planId);

      // Mostrar mensagem informativa
      await this.showToast('Redirecionando para ativação...', 'success');

      // O status será atualizado automaticamente via webhook quando o pagamento for concluído
    } catch (e: any) {
      await this.showToast(
        e?.error?.message || 'Erro ao ativar plano gratuito',
        'danger'
      );
      console.error('❌ Erro ao ativar plano gratuito:', e);
    } finally {
      this.loading = false;
    }
  }

  showMigrar(plan: Plan): boolean {
    return this.canMigrateTo(plan);
  }

  showCancelarParaMigrar(plan: Plan): boolean {
    return this.mustCancelFirst(plan);
  }
  /**
   * Verifica se o usuário pode cancelar a assinatura
   */
  canCancelSubscription(): boolean {
    // Verificar se já cancelou uma vez (política local)
    if (this.hasCancelledOnce) {
      return false;
    }

    // Verificar se will_cancel está true (dados do servidor)
    if (this.meAssinaturaData?.will_cancel) {
      return false;
    }

    // Verificar se há cancelamento agendado
    if (this.hasScheduledCancellation()) {
      return false;
    }

    // Verificar se está ativo
    return this.isActive;
  }

  /**
   * Obtém informações do plano atual usando os novos dados da API
   */
  getCurrentPlanInfo(): PlanInfo | null {
    return this.planInfoData;
  }

  /**
   * Obtém dados da assinatura atual usando os novos dados da API
   */
  getCurrentSubscriptionInfo(): SubscriptionInfo | null {
    return this.subscriptionData;
  }

  /**
   * Verifica se o plano atual é gratuito
   */
  isCurrentPlanFree(): boolean {
    return this.planInfoData?.is_free || false;
  }

  /**
   * Obtém o valor do plano atual
   */
  getCurrentPlanValue(): number {
    return this.planInfoData?.valor || 0;
  }

  /**
   * Obtém o nome de exibição do plano atual
   */
  getCurrentPlanDisplayName(): string {
    return (
      this.planInfoData?.display_name ||
      this.currentUser?.plan ||
      'Plano não identificado'
    );
  }

  /**
   * Obtém dados do endpoint /me/assinatura
   */
  getMeAssinaturaData(): MeAssinaturaResponse | null {
    return this.meAssinaturaData;
  }

  /**
   * Verifica se o cancelamento está agendado (will_cancel = true)
   */
  isCancellationScheduled(): boolean {
    return this.meAssinaturaData?.will_cancel || false;
  }

  /**
   * Obtém a política da assinatura
   */
  getSubscriptionPolicy() {
    return this.meAssinaturaData?.policy || null;
  }

  /**
   * Obtém o texto do botão de cancelar baseado no estado atual
   */
  getCancelButtonText(): string {
    if (this.isCancellationScheduled()) {
      return 'Cancelamento Confirmado';
    }

    if (this.hasScheduledCancellation()) {
      return 'Cancelamento Agendado';
    }

    if (this.hasCancelledOnce) {
      return 'Cancelamento Não Permitido';
    }

    return 'Cancelar Assinatura';
  }

  /**
   * Verifica se há cancelamento agendado
   */
  hasScheduledCancellation(): boolean {
    // Verificar se will_cancel está true (dados do servidor)
    if (this.meAssinaturaData?.will_cancel) {
      return true;
    }

    // Usar dados da nova API se disponíveis, senão fallback para dados antigos
    const endsAt = this.subscriptionData?.ends_at || this.assinaturaMe?.ends_at;

    if (!endsAt) return false;

    return endsAt !== null && endsAt !== undefined && endsAt !== '';
  }

  /**
   * Retorna a data de fim do período de cancelamento
   */
  getCancellationDate(): string {
    if (!this.hasScheduledCancellation()) return '';
    // Priorizar dados do endpoint /me/assinatura
    if (this.meAssinaturaData?.ends_at) {
      return this.meAssinaturaData.ends_at;
    }
    // Fallback para outros dados
    return this.subscriptionData?.ends_at || this.assinaturaMe?.ends_at || '';
  }

  /**
   * Trata mudanças no status de pagamento
   */
  private handlePaymentStatusChange(status: string): void {
    switch (status) {
      case 'processing':
        break;
      case 'succeeded':
        setTimeout(async () => {
          await this.loadUser();
          await this.loadPlans();
          this.applyFilter();
        }, 1000);
        break;
      case 'failed':
        break;
      case 'cancelled':
        break;
      default:
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'medium' = 'medium'
  ) {
    const t = await this.toast.create({
      message,
      duration: 2400,
      color,
      position: 'bottom',
    });
    await t.present();
  }

  ngOnDestroy(): void {
    // Limpar subscription para evitar memory leaks
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.paymentStatusSubscription) {
      this.paymentStatusSubscription.unsubscribe();
    }

    // Remover event listener
    window.removeEventListener('paymentStatusChanged', () => {
      this.loadUser();
      this.loadPlans();
    });
  }

  /**
   * Método chamado quando a página é focada novamente
   * Útil para verificar se o pagamento foi processado quando o usuário retorna do navegador
   */
  async ionViewDidEnter() {
    // Verificar se há um pagamento em processamento
    const currentStatus = this.pay.getCurrentPaymentStatus();
    if (currentStatus === 'processing') {

      // Verificar status da assinatura
      try {
        const assinatura = await this.pay.checkSubscriptionStatus();
        if (assinatura?.active || assinatura?.status === 'active') {
          await this.showToast('Pagamento processado com sucesso!', 'success');

          // Recarregar dados e atualizar segmento
          await this.loadUser();
          await this.loadPlans();
          this.applyFilter();
        }
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
      }
    } else {
      await this.loadUser();
      await this.loadPlans();
      this.applyFilter();
    }
  }
}
