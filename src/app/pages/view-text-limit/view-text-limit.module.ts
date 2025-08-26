import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ViewTextLimitPage } from './view-text-limit.page';
import { HighlightPipe } from 'src/app/pipes/highlight.pipe';
import { ViewTextPageRoutingModule } from './view-text-limit-routing.module';
import { RegimentoModalModule } from '../../Modals/regimento-modal/regimento-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ViewTextPageRoutingModule,
    RegimentoModalModule
  ],
  declarations: [ViewTextLimitPage, HighlightPipe]
})
export class ViewTextLimitPageModule {}
