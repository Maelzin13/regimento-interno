import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ViewTextPage } from './view-text.page';
import { ViewTextPageRoutingModule } from './view-text-routing.module';
import { RegimentoModalModule } from '../../Modals/regimento-modal/regimento-modal.module';


@NgModule({
  imports: [
    FormsModule,
    IonicModule,
    CommonModule,
    RegimentoModalModule,
    ViewTextPageRoutingModule,
  ],
  declarations: [ViewTextPage]
})
export class ViewTextPageModule {}
