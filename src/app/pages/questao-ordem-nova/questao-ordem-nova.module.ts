import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { QuestaoOrdemNovaPageRoutingModule } from './questao-ordem-nova-routing.module';

import { QuestaoOrdemNovaPage } from './questao-ordem-nova.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QuestaoOrdemNovaPageRoutingModule
  ],
  declarations: [QuestaoOrdemNovaPage]
})
export class QuestaoOrdemNovaPageModule {}
