import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { PlansService } from 'src/app/services/plans.service';
import { PaymentService } from 'src/app/services/payment.service';
import { Plan, PlansResponse } from 'src/app/models/plan.model';

type Intervalo = 'Mensal' | 'Anual';

@Component({
  selector: 'app-assinatura',
  templateUrl: './assinatura.page.html',
  styleUrls: ['./assinatura.page.scss'],
})
export class AssinaturaPage implements OnInit {
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
  isLoadingCancelar = false;
  monthlyPlans: Plan[] = [];
  filteredPlans: Plan[] = [];
  segment: Intervalo = 'Mensal';
  planoAtivo: Plan | null = null;
  currentUser: UserModel | null = null;
  plansData: PlansResponse | null = null;
  activeInterval: Intervalo | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private pay: PaymentService,
    private toast: ToastController,
    private plansService: PlansService,
    private loadingController: LoadingController
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadUser();
    await this.loadPlans();
    this.applyFilter();
  }

  // ========= helpers regras de negócio =========

  private deriveUserFlags() {
    this.isActive = ['active', 'trialing'].includes(this.currentUser?.subscription_status ?? '');

    // deduz intervalo pelo nome do plano salvo no usuário
    const p = (this.currentUser?.plan || '').toLowerCase();
    if (p.includes('mensal')) this.activeInterval = 'Mensal';
    else if (p.includes('anual')) this.activeInterval = 'Anual';
    else this.activeInterval = null;
  }

  isPlanActive(plan: Plan): boolean {
    if (!this.isActive) return false;
    // sem id do preço na tabela do usuário, usamos heurística pelo intervalo/nome:
    const u = (this.currentUser?.plan || '').toLowerCase();
    const nomeMatch = u && plan?.nome && u.includes(plan.nome.toLowerCase());
    const intervaloMatch = !!this.activeInterval && plan.intervalo === this.activeInterval;
    // Se houver dois “Free”, você pode optar por ocultá-los da UI
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
    // Regra ANUAL -> MENSAL exige cancelamento
    return this.isActive && this.activeInterval === 'Anual' && plan.intervalo === 'Mensal';
  }
  
  formatDate(date: any): any {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  // ============ carregamento ============

  private async loadUser(): Promise<void> {
    const loading = await this.loadingController.create({ message: 'Carregando...', spinner: 'crescent' });
    try {
      await loading.present();
      this.currentUser = await this.auth.getUser();
      console.log(this.currentUser);
      this.deriveUserFlags();
    } catch (error) {
      await this.showToast('Erro ao carregar usuário', 'danger');
      console.error(error);
    } finally {
      await loading.dismiss();
    }
  }

  private async loadPlans(): Promise<void> {
    this.isLoading = true;
    try {
      this.plansData = await this.plansService.getPlans();

      this.assinaturaAtiva = this.plansData.assinaturaAtiva;
      console.log(this.assinaturaAtiva);

      // base para filtros
      this.allPlans = this.plansData.planos ?? [];

      // se quiser ocultar FREE:
      this.allPlans = this.allPlans.filter(p => p.nome?.toLowerCase() !== 'free');

      // detecta segmento inicial conforme o plano do usuário
      if (this.isActive && this.activeInterval) {
        this.segment = this.activeInterval;
      }

      // pré-filtrados
      this.monthlyPlans = this.allPlans.filter(p => p.intervalo === 'Mensal');
      this.annualPlans  = this.allPlans.filter(p => p.intervalo === 'Anual');



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
    this.filteredPlans = this.segment === 'Anual' ? [...this.annualPlans] : [...this.monthlyPlans];
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
        // refaz estado local
        await this.loadUser();
        await this.loadPlans();
        this.applyFilter();
      } else {
        await this.showToast(res?.message || 'Não foi possível cancelar', 'warning');
      }
    } catch (e: any) {
      await this.showToast(e?.error?.message || 'Erro ao cancelar assinatura', 'danger');
      console.error(e);
    } finally {
      this.isLoadingCancelar = false;
    }
  }

  async assinar(priceId: string) {
    // só permite se NÃO estiver ativo
    if (this.isActive) {
      await this.showToast('Você já possui assinatura ativa.', 'warning');
      return;
    }
    try {
      this.loading = true;
      await this.pay.startCheckout(priceId);
      // confirmação virá via deep link
    } catch (e: any) {
      await this.showToast(e?.error?.message || 'Erro ao iniciar checkout', 'danger');
      console.error(e);
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
    return true;                                        // usuário sem assinatura -> pode assinar
  }

  showMigrar(plan: Plan): boolean {
    // mostra botão "Migrar para Anual" apenas quando habilitado
    return this.canMigrateTo(plan);
  }

  showCancelarParaMigrar(plan: Plan): boolean {
    // mostra CTA para cancelar antes, quando tentar anual -> mensal
    return this.mustCancelFirst(plan);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'medium') {
    const t = await this.toast.create({ message, duration: 2400, color, position: 'bottom' });
    await t.present();
  }
}
