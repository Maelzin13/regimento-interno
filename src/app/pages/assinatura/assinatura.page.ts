import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { PlansService } from 'src/app/services/plans.service';
import { PaymentService } from 'src/app/services/payment.service';
import { Plan, PlansResponse } from 'src/app/models/plan.model';
import { StorageService } from 'src/app/services/storage.service';
import { Subscription } from 'rxjs';

type Intervalo = 'Mensal' | 'Anual' | 'Free';

@Component({
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
  private userSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private pay: PaymentService,
    private toast: ToastController,
    private storage: StorageService,
    private plansService: PlansService,
    private loadingController: LoadingController,
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
  }

  // ========= helpers regras de negócio =========

  private deriveUserFlags() {
    this.isActive = ['active', 'trialing'].includes(this.currentUser?.subscription_status ?? '');

    // deduz intervalo pelo nome do plano salvo no usuário OU pelo ID da assinatura ativa
    const p = (this.currentUser?.plan || '').toLowerCase();
    const assinaturaId = this.assinaturaAtiva?.id;
    
    if (p.includes('mensal')) {
      this.activeInterval = 'Mensal';
    } else if (p.includes('anual')) {
      this.activeInterval = 'Anual';
    } else if (p.includes('free') || p.includes('gratuito')) {
      this.activeInterval = 'Free';
    } else if (assinaturaId) {
      // Se não temos nome do plano, tentar deduzir pelo ID da assinatura
      this.activeInterval = this.deduzirIntervaloPorId(assinaturaId);
    } else {
      this.activeInterval = null;
    }
  }

  private deduzirIntervaloPorId(assinaturaId: string): Intervalo | null {
    // IDs dos planos Free
    const freeIds = [
      'price_1Ry2e5FHDwuz6ZFYjvJmbvWX', // Free Mensal
      'price_1Ry2cfFHDwuz6ZFYQpFvhkGw'  // Free Anual
    ];
    
    // IDs dos planos pagos
    const mensalIds = ['price_1R1wDvFHDwuz6ZFYld8HKutC']; // Plano Mensal
    const anualIds = ['price_1R1wElFHDwuz6ZFYgYItI2bM'];  // Plano Anual
    
    if (freeIds.includes(assinaturaId)) {
      return 'Free';
    } else if (mensalIds.includes(assinaturaId)) {
      return 'Mensal';
    } else if (anualIds.includes(assinaturaId)) {
      return 'Anual';
    }
    
    return null;
  }

  isPlanActive(plan: Plan): boolean {
    if (!this.isActive) return false;
    
    // Verificar se o ID do plano corresponde ao ID da assinatura ativa
    if (this.assinaturaAtiva?.id && plan.id === this.assinaturaAtiva.id) {
      return true;
    }
    
    // Fallback: usar heurística pelo intervalo/nome
    const u = (this.currentUser?.plan || '').toLowerCase();
    const nomeMatch = u && plan?.nome && u.includes(plan.nome.toLowerCase());
    const intervaloMatch = !!this.activeInterval && plan.intervalo === this.activeInterval;
    
    return nomeMatch || intervaloMatch;
  }

  canMigrateTo(plan: Plan): boolean {
    // Regra:
    // - Se usuário tem MENSAL ativo, pode migrar para ANUAL
    if (this.isActive && this.activeInterval === 'Mensal' && plan.intervalo === 'Anual') return true;
    // - Se usuário tem ANUAL ativo, não migra para MENSAL (precisa cancelar antes)
    return false;
  }

  mustCancelFirst(plan: Plan): boolean {
    return this.isActive && this.activeInterval === 'Anual' && plan.intervalo === 'Mensal';
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
    const loading = await this.loadingController.create({ message: 'Carregando...', spinner: 'crescent' });
    try {
      await loading.present();
      
      // Limpar dados de assinatura antes de carregar novos
      this.assinaturaMe = null;
      this.assinaturaAtiva = null;
      
      this.currentUser = await this.auth.fetchProfile();
      
      // Carregar dados de assinatura apenas se o usuário estiver logado
      if (this.currentUser) {
        try {
          const assinatura = await this.pay.getMeAssinatura();
          if (assinatura) {
            this.assinaturaMe = assinatura;
          }
        } catch (assinaturaError) {
          console.warn('Erro ao carregar assinatura:', assinaturaError);
          // Não falha o carregamento se não conseguir carregar assinatura
        }
        
        await this.storage.set('authUser', this.currentUser);
        this.deriveUserFlags();
      }
    } catch (error) {
      await this.showToast('Erro ao carregar usuário', 'danger');
      console.error('❌ Erro ao carregar usuário:', error);
    } finally {
      await loading.dismiss();
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
      this.allPlans = this.allPlans.filter(p => p.nome !== '"myproduct"');
      if (this.isActive && this.activeInterval) {
        this.segment = this.activeInterval;
      }

      this.monthlyPlans = this.allPlans.filter(p => 
        p.intervalo === 'Mensal' && 
        p.nome !== 'Free' && 
        p.preco !== 'R$ 0,00'
      );
      
      this.annualPlans = this.allPlans.filter(p => 
        p.intervalo === 'Anual' && 
        p.nome !== 'Free' && 
        p.preco !== 'R$ 0,00'
      );
      
      this.freePlans = this.allPlans.filter(p => 
        p.nome === 'Free' || 
        p.preco === 'R$ 0,00' ||
        p.preco === '0,00' ||
        p.preco === '0'
      );
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
    this.isLoadingCancelar = true;
    try {
      const res = await this.pay.cancelSubscription();
      if (res?.success) {
        await this.showToast(res.message || 'Cancelamento agendado', 'success');
        
        // Forçar sincronização para obter dados atualizados após cancelamento
        await this.loadUser();
        await this.loadPlans();
        this.applyFilter();
      } else {
        await this.showToast(res?.message || 'Não foi possível cancelar', 'warning');
      }
    } catch (e: any) {
      await this.showToast(e?.error?.message || 'Erro ao cancelar assinatura', 'danger');
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
      await this.pay.startCheckout(priceId);
      // confirmação virá via deep link
      await this.showToast('Assinatura iniciada.', 'success');
      
      // Forçar sincronização para obter dados atualizados após assinatura
      await this.loadUser(); 
      await this.loadPlans();
      this.applyFilter();
    } catch (e: any) {
      await this.showToast(e?.error?.message || 'Erro ao iniciar checkout', 'danger');
      console.error('❌ Erro ao iniciar checkout:', e);
    } finally {
      this.loading = false;
    }
  }

  async migrar(priceId: string) {
    // só permite MENSAL -> ANUAL
    if (!(this.isActive && this.activeInterval === 'Mensal')) {
      await this.showToast('Migração indisponível para seu plano atual.', 'warning');
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
        await this.showToast(res?.message || 'Não foi possível atualizar o plano', 'warning');
      }
    } catch (e: any) {
      await this.showToast(e?.error?.message || 'Erro ao atualizar o plano', 'danger');
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  // ============ UI helpers ============

  showAssinar(plan: Plan): boolean {
    if (this.isPlanActive(plan)) return false;          // nunca mostra se é o ativo
    if (this.isActive) return false;                    // usuário já tem assinatura ativa
    if (this.isPlanFree(plan)) return false;            // planos free não mostram botão assinar
    return true;                                        // usuário sem assinatura -> pode assinar
  }

  isPlanFree(plan: Plan): boolean {
    return plan.nome === 'Free' || 
           plan.preco === 'R$ 0,00' || 
           plan.preco === '0,00' || 
           plan.preco === '0' ||
           plan.preco === 'R$ 0';
  }

  async ativarPlanoFree(planId: string) {
    this.loading = true;
    try {
      await this.pay.startCheckout(planId);
      await this.showToast('Plano gratuito ativado com sucesso!', 'success');
      
      // Forçar sincronização para obter dados atualizados
      await this.loadUser();
      await this.loadPlans();
      this.applyFilter();
    } catch (e: any) {
      await this.showToast(e?.error?.message || 'Erro ao ativar plano gratuito', 'danger');
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
   * Verifica se há cancelamento agendado
   */
  hasScheduledCancellation(): boolean {
    if (!this.assinaturaMe?.ends_at) return false;
    
    return this.assinaturaMe.ends_at !== null && 
           this.assinaturaMe.ends_at !== undefined &&
           this.assinaturaMe.ends_at !== '';
  }

  /**
   * Retorna a data de fim do período de cancelamento
   */
  getCancellationDate(): string {
    if (!this.hasScheduledCancellation()) return '';
    return this.assinaturaMe?.ends_at || '';
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'medium') {
    const t = await this.toast.create({ message, duration: 2400, color, position: 'bottom' });
    await t.present();
  }

  ngOnDestroy(): void {
    // Limpar subscription para evitar memory leaks
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}
