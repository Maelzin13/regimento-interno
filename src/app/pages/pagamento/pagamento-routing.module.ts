import { NgModule } from '@angular/core';
import { PagamentoPage } from './pagamento.page';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: PagamentoPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagamentoPageRoutingModule {}
