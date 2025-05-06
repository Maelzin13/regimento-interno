import { Component, OnInit } from '@angular/core';
import { PaymentService } from 'src/app/services/payment.service';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-pagamento',
  templateUrl: './pagamento.page.html',
  styleUrls: ['./pagamento.page.scss'],
})
export class PagamentoPage implements OnInit {
  pagamentos: any[] = [];
  isLoading = true;

  constructor(
    private pagamentosService: PaymentService,
    private navCtrl: NavController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadPagamentos();
  }

  async loadPagamentos() {
    this.isLoading = true;
    try {
      this.pagamentos = await this.pagamentosService.getPayments();
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async doRefresh(event: any) {
    try {
      await this.loadPagamentos();
      this.showSuccessToast();
    } catch (e) {
      console.error(e);
    } finally {
      event.target.complete();
    }
  }

  async showSuccessToast() {
    const toast = await this.toastController.create({
      message: 'Pagamentos atualizados com sucesso!',
      duration: 2000,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }

  async roolBack() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
