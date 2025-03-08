import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModalNotasPageRoutingModule } from './modal-notas-routing.module';

import { ModalNotasPage } from './modal-notas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModalNotasPageRoutingModule
  ],
  declarations: [ModalNotasPage]
})
export class ModalNotasPageModule {}
