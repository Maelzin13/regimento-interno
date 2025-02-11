import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { PaymentService } from 'src/app/services/payment.service';

@Component({
  selector: 'app-payment-form',
  templateUrl: './payment-form.page.html',
  styleUrls: ['./payment-form.page.scss'],
})
export class PaymentFormPage {
  planType = 'monthly';

  paymentData = {
    customer_name: '',
    customer_identity: '',
    customer_phone: '',
    customer_email: '',
    address_zipcode: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
    card_holder: '',
    card_number: '',
    expiration_date: '',
    security_code: '',
    installments: 1,
    amount: this.planType === 'monthly' ? 19.99 : 190.0,
    plan_type: this.planType === 'monthly' ? 'Plano Mensal' : 'Plano Anual',
  };

  constructor(
    private paymentService: PaymentService,
    private router: Router,
    private loadingController: LoadingController
  ) {}

  async submitPayment() {
    const loading = await this.loadingController.create({
      message: 'Processando pagamento...',
      spinner: 'bubbles',
      duration: 5000,
      cssClass: 'custom-loading',
    });
    await loading.present();
    try {
      const response = await this.paymentService.processPayment(
        this.paymentData
      );
      console.log('Pagamento processado com sucesso:', response);

      this.router.navigate(['/payment-success'], {
        state: { transactionDetails: response },
      });
    } catch (error) {
      console.error('Erro ao processar o pagamento:', error);
    } finally {
      await loading.dismiss();
    }
  }

  // Máscaras para campos
  applyCpfMask(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    event.target.value = value.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
  }

  applyPhoneMask(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    event.target.value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  applyCepMask(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    event.target.value = value.replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  applyCardMask(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    event.target.value = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  applyExpirationDateMask(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    event.target.value = value.replace(/(\d{2})(\d{4})/, '$1/$2');
  }
}
