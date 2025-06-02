import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { QuestaoOrdemNovaPage } from './questao-ordem-nova.page';
import { NovaOremModalPage } from './nova-orem-modal/nova-orem-modal.page';
import { EditOredemModalPage } from './edit-oredem-modal/edit-oredem-modal.page';
import { QuestaoOrdemNovaPageRoutingModule } from './questao-ordem-nova-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QuestaoOrdemNovaPageRoutingModule
  ],
  declarations: [QuestaoOrdemNovaPage, EditOredemModalPage, NovaOremModalPage]
})
export class QuestaoOrdemNovaPageModule {}
