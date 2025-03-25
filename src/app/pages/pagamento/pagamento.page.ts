import { NavController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { PaymentService } from 'src/app/services/payment.service';

@Component({
  selector: 'app-pagamento',
  templateUrl: './pagamento.page.html',
  styleUrls: ['./pagamento.page.scss'],
})
export class PagamentoPage implements OnInit {
  pagamentos: any[] = [];
  constructor(
    private navCtrl: NavController,
    private pagamentosService: PaymentService
  ) {}

  ngOnInit() {
    this.pagamentosService
      .getPayments()
      .then((data) => {
        this.pagamentos = data;
      })
      .catch((error) => {
        console.error('Erro ao carregar pagamentos:', error);
      });
  }

  async roolBack() {
    this.navCtrl.navigateRoot(['/home/menu']);
  }
}
