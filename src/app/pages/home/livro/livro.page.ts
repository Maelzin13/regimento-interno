import { ModalController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserModel } from 'src/app/models/userModel';
import { AuthService } from 'src/app/services/auth.service';
import { BookService } from 'src/app/services/book.service';
import { PlansService } from 'src/app/services/plans.service';
import { DescricaoModalComponent } from 'src/app/Modals/descricao-modal/descricao-modal.component';

@Component({
  selector: 'app-livro',
  templateUrl: './livro.page.html',
  styleUrls: ['./livro.page.scss'],
})
export class LivroPage implements OnInit {
  books: any; 
  bookLimit: any;
  isActive = false;
  isFreePlan = false;
  assinaturaAtiva: any = null;
  user: UserModel | null = null;

  textos = [
    {
      title: 'Código de Ética e Decoro Parlamentar',
      link: 'https://www2.camara.leg.br/legin/fed/rescad/2001/resolucaodacamaradosdeputados-25-10-outubro-2001-320496-norma-pl.html',
    },
    {
      title: 'Regimento do Senado',
      link: 'https://www25.senado.leg.br/documents/12427/45868/RISF+2018+Volume+1.pdf/cd5769c8-46c5-4c8a-9af7-99be436b89c4',
    },
    {
      title: 'Regimento Comum',
      link: 'https://www25.senado.leg.br/documents/59501/97171143/RCCN.pdf',
    },
    {
      title: 'Resolução n. 1/2002 do C.N',
      link: 'https://www2.camara.leg.br/legin/fed/rescon/2002/resolucao-1-8-maio-2002-497942-norma-pl.html',
    },
    {
      title: 'Lei Complementar 95/1998',
      link: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp95compilado.htm',
    },
    {
      title: 'Atos da Mesa',
      description:
        'Atos diretamente relacionados ao processo legislativo strictu sensu.',
    }
  ];

  constructor(
    public bookService: BookService,
    private authService: AuthService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private plansService: PlansService
  ) {}

  async ngOnInit() {
    try {
      this.user = await this.authService.getUser();
      console.log('user', this.user?.is_admin);
      console.log('user', this.user?.subscription_status);
      const plansData = await this.plansService.getPlans();
      this.assinaturaAtiva = plansData.assinaturaAtiva;
      console.log('assinaturaAtiva', this.assinaturaAtiva);
      this.isFreePlan = this.checkIfFreePlan();
      console.log('isFreePlan', this.isFreePlan);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async openDescricaoModal(texto: any) {
    const modal = await this.modalCtrl.create({
      component: DescricaoModalComponent,
      componentProps: {
        titulo: texto.title,
        descricao: texto.description,
      },
    });

    await modal.present();
  }

  async showSubscriptionMessage() {
    const toast = await this.toastCtrl.create({
      message: 'É necessário ter uma assinatura ativa para acessar este conteúdo',
      duration: 3000,
      position: 'middle',
      color: 'warning'
    });
    await toast.present();
  }

  cleanHTML(content: string): string {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return doc.body.textContent || '';
  }

  /**
   * Verifica se o usuário tem plano ativo
   */
  hasActivePlan(): boolean {
    return this.user ? this.user.subscription_status === 'active' : false;
  }

  /**
   * Verifica se o plano ativo é Free
   */
  private checkIfFreePlan(): boolean {
    if (!this.assinaturaAtiva?.id) {
      return false;
    }

    // IDs dos planos Free
    const freeIds = [
      'price_1Ry2e5FHDwuz6ZFYjvJmbvWX', // Free Mensal
      'price_1Ry2cfFHDwuz6ZFYQpFvhkGw'  // Free Anual
    ];

    return freeIds.includes(this.assinaturaAtiva.id);
  }

  /**
   * Verifica se o usuário tem acesso completo (plano pago)
   */
  hasFullAccess(): boolean {
    return this.hasActivePlan() || this.user?.is_admin === true;
  }
}
