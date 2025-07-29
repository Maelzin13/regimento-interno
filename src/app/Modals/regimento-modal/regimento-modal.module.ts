import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RegimentoModalComponent } from './regimento-modal.component';

@NgModule({
  declarations: [
    RegimentoModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [
    RegimentoModalComponent
  ]
})
export class RegimentoModalModule { }
