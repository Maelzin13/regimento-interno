import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.page.html',
  styleUrls: ['./payment-success.page.scss'],
})
export class PaymentSuccessPage implements OnInit {
  transactionDetails: any;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.transactionDetails = nav?.extras?.state?.['transactionDetails'] || {};
  }

  ngOnInit() {
    console.log('Detalhes da transação:', this.transactionDetails);
  }
}
