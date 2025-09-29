import { ModalController, ToastController, LoadingController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { PaymentService } from 'src/app/services/payment.service';
import { AuthService } from 'src/app/services/auth.service';
import { PlansService } from 'src/app/services/plans.service';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { UserModel } from 'src/app/models/userModel';
import { Plan, PlansResponse } from 'src/app/models/plan.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-assinatura',
  templateUrl: './assinatura.page.html',
  styleUrls: ['./assinatura.page.scss'],
})
export class AssinaturaPage implements OnInit {
  currentUser: UserModel | null = null;
  plansData: PlansResponse | null = null;
  availablePlans: Plan[] = [];
  monthlyPlans: Plan[] = [];
  annualPlans: Plan[] = [];
  loading = false;

  get platform(): 'ios'|'android'|'web' {
    return Capacitor.getPlatform() as any;
  }

  constructor(
    private router: Router,
    private auth: AuthService,
    private pay: PaymentService,
    private modal: ModalController,
    private toast: ToastController,
    private plansService: PlansService,
    private loadingController: LoadingController
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  /**
   * Carrega dados do usuário e planos
   */
  private async loadData(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Carregando...',
      spinner: 'crescent'
    });
    
    try {
      await loading.present();
      
      // Carregar dados do usuário
      this.currentUser = await this.auth.getUser();
      
      // Carregar planos da API
      await this.loadPlans();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      await this.mostrarToast('Erro ao carregar dados. Tente novamente.', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Carrega planos da API
   */
  private async loadPlans(): Promise<void> {
    try {
      this.plansData = await this.plansService.getPlans();
      this.availablePlans = this.plansService.getActivePlans(this.plansData.planos);
      this.monthlyPlans = this.plansService.getMonthlyPlans(this.availablePlans);
      this.annualPlans = this.plansService.getAnnualPlans(this.availablePlans);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      // Fallback para planos do environment
      this.availablePlans = [
        {
          id: environment.stripePrices.mensal,
          nome: 'Plano Mensal',
          preco: 'R$ 19,00',
          intervalo: 'Mensal',
          ativo: true,
          atualizavel: true
        },
        {
          id: environment.stripePrices.anual,
          nome: 'Plano Anual',
          preco: 'R$ 190,00',
          intervalo: 'Anual',
          ativo: true,
          atualizavel: true
        }
      ];
      this.monthlyPlans = this.availablePlans.filter(p => p.intervalo === 'Mensal');
      this.annualPlans = this.availablePlans.filter(p => p.intervalo === 'Anual');
    }
  }

  fecharModal() {
    this.router.navigate(['/home/menu']);
  }

  async portal() { 
    await this.pay.openBillingPortal(); 
  }

  /**
   * Processa assinatura de um plano específico
   */
  async assinarPlano(plan: Plan) {
    // Verificar se pode migrar para mensal
    if (plan.intervalo.toLowerCase() === 'mensal' && this.hasActiveAnnualPlan()) {
      await this.mostrarToast('Para assinar o plano mensal, primeiro cancele seu plano anual.', 'warning');
      return;
    }
    
    // Se já tem plano anual ativo, não pode assinar novamente
    if (plan.intervalo.toLowerCase() === 'anual' && this.hasActiveAnnualPlan()) {
      await this.mostrarToast('Você já possui um plano anual ativo.', 'warning');
      return;
    }
    
    await this.processarAssinatura(plan.id, plan.nome);
  }

  /**
   * Processa assinatura mensal (método de compatibilidade)
   */
  async assinarMensal() {
    const monthlyPlan = this.monthlyPlans[0];
    if (monthlyPlan) {
      await this.assinarPlano(monthlyPlan);
    }
  }

  /**
   * Processa assinatura anual (método de compatibilidade)
   */
  async assinarAnual() {
    const annualPlan = this.annualPlans[0];
    if (annualPlan) {
      await this.assinarPlano(annualPlan);
    }
  }

  /**
   * Processa assinatura baseado na plataforma
   */
  private async processarAssinatura(priceId: string, tipo: string) {
    const loading = await this.loadingController.create({
      message: 'Processando pagamento...',
      spinner: 'crescent'
    });
    
    try {
      await loading.present();
      
      // Usar fluxo web para todas as plataformas
      await this.pay.processPayment(priceId);
      
      await this.mostrarToast(`Assinatura ${tipo} iniciada com sucesso!`, 'success');
      
    } catch (error) {
      console.error('Erro ao processar assinatura:', error);
      await this.mostrarToast('Erro ao processar pagamento. Tente novamente.', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Mostra toast de feedback
   */
  private async mostrarToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toast.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Verifica se o usuário tem um plano anual ativo
   */
  hasActiveAnnualPlan(): boolean {
    if (!this.currentUser) return false;
    
    const plan = this.currentUser.plan?.toLowerCase() || '';
    const status = this.currentUser.subscription_status?.toLowerCase() || '';
    
    return status === 'active' && (plan.includes('anual') || plan.includes('annual'));
  }

  /**
   * Verifica se o usuário tem um plano mensal ativo
   */
  hasActiveMonthlyPlan(): boolean {
    if (!this.currentUser) return false;
    
    const plan = this.currentUser.plan?.toLowerCase() || '';
    const status = this.currentUser.subscription_status?.toLowerCase() || '';
    
    return status === 'active' && (plan.includes('mensal') || plan.includes('monthly'));
  }

  /**
   * Verifica se o usuário tem alguma assinatura ativa
   */
  hasActiveSubscription(): boolean {
    if (!this.currentUser) return false;
    
    const status = this.currentUser.subscription_status?.toLowerCase() || '';
    return status === 'active';
  }

  /**
   * Retorna o plano atual do usuário
   */
  get currentPlan(): string {
    return this.currentUser?.plan || 'Nenhum plano ativo';
  }

  /**
   * Retorna o status da assinatura
   */
  get subscriptionStatus(): string {
    return this.currentUser?.subscription_status || 'inactive';
  }

  /**
   * Verifica se pode migrar de mensal para anual
   */
  canUpgradeToAnnual(): boolean {
    return this.hasActiveMonthlyPlan();
  }

  /**
   * Verifica se o botão mensal deve estar desabilitado
   */
  get isMonthlyButtonDisabled(): boolean {
    return this.hasActiveAnnualPlan();
  }

  /**
   * Verifica se o botão anual deve estar desabilitado
   */
  get isAnnualButtonDisabled(): boolean {
    return this.hasActiveAnnualPlan();
  }

  /**
   * Retorna a mensagem de status do plano
   */
  get planStatusMessage(): string {
    if (!this.currentUser) return 'Nenhum plano ativo';
    
    if (this.hasActiveAnnualPlan()) {
      return 'Plano Anual Ativo - Para migrar para mensal, cancele primeiro';
    }
    
    if (this.hasActiveMonthlyPlan()) {
      return 'Plano Mensal Ativo - Pode migrar para anual';
    }
    
    return 'Nenhum plano ativo';
  }

  /**
   * Verifica se um plano específico está ativo
   */
  isPlanActive(plan: Plan): boolean {
    if (!this.currentUser) return false;
    
    const userPlan = this.currentUser.plan?.toLowerCase() || '';
    const planName = plan.nome.toLowerCase();
    const planInterval = plan.intervalo.toLowerCase();
    
    return userPlan.includes(planName) && userPlan.includes(planInterval);
  }

  /**
   * Verifica se um plano pode ser assinado
   */
  canSubscribeToPlan(plan: Plan): boolean {
    if (plan.intervalo.toLowerCase() === 'mensal' && this.hasActiveAnnualPlan()) {
      return false;
    }
    
    if (plan.intervalo.toLowerCase() === 'anual' && this.hasActiveAnnualPlan()) {
      return false;
    }
    
    return true;
  }

  /**
   * Retorna o texto do botão para um plano
   */
  getPlanButtonText(plan: Plan): string {
    if (this.isPlanActive(plan)) {
      return 'Plano Ativo';
    }
    
    if (plan.intervalo.toLowerCase() === 'anual' && this.hasActiveMonthlyPlan()) {
      return 'Migrar para Anual';
    }
    
    return `Assinar ${plan.nome}`;
  }

  /**
   * Retorna a cor do botão para um plano
   */
  getPlanButtonColor(plan: Plan): string {
    if (this.isPlanActive(plan)) {
      return 'medium';
    }
    
    if (plan.intervalo.toLowerCase() === 'anual' && this.hasActiveMonthlyPlan()) {
      return 'success';
    }
    
    return 'primary';
  }

  /**
   * Verifica se deve mostrar botões nativos ou web
   */
  get shouldShowNativeButtons(): boolean {
    return this.platform === 'android';
  }

  /**
   * Verifica se deve mostrar botões web (iOS)
   */
  get shouldShowWebButtons(): boolean {
    return this.platform === 'ios';
  }
}