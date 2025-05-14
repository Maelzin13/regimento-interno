import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RegimentoModalComponent } from './regimento-modal.component';

@NgModule({
  declarations: [RegimentoModalComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [RegimentoModalComponent]
})
export class RegimentoModalModule { } 