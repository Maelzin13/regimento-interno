import { Component, OnInit } from '@angular/core';
import { Stripe } from '@capacitor-community/stripe';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor() {
    Stripe.initialize({
      publishableKey: environment.stripePublishableKey,
    });
  }

  ngOnInit() {
    console.log('Hello World');
  }
}
