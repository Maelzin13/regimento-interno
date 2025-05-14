import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ViewTextPageRoutingModule } from './view-text-routing.module';

import { ViewTextPage } from './view-text.page';

import { RegimentoModalModule } from '../../Modals/regimento-modal/regimento-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewTextPageRoutingModule,
    RegimentoModalModule
  ],
  declarations: [ViewTextPage]
})
export class ViewTextPageModule {}
