import { Component } from '@angular/core';
import { PaymentService } from 'src/app/services/payment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-form',
  templateUrl: './payment-form.page.html',
  styleUrls: ['./payment-form.page.scss'],
})
export class PaymentFormPage {
  paymentData = {
    customer_name: '',
    customer_identity: '',
    customer_phone: '',
    customer_email: '',
    address_zipcode: '',
    address_street: '',
    address_number: '',
    address_district: '',
    address_city: '',
    address_state: '',
    card_holder: '',
    card_number: '',
    expiration_date: '',
    security_code: '',
    installments: 1,
    amount: '100.00', // Valor fixo para exemplo
  };

  constructor(private paymentService: PaymentService, private router: Router) {}

  async submitPayment() {
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
