import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PaymentFormPage } from './payment-form.page';

const routes: Routes = [
  {
    path: '',
    component: PaymentFormPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PaymentFormPageRoutingModule {}
