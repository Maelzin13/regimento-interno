import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PagamentoPage } from './pagamento.page';
import { PagamentoPageRoutingModule } from './pagamento-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PagamentoPageRoutingModule],
  declarations: [PagamentoPage],
})
export class PagamentoPageModule {}
