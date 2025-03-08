import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModalNotasPage } from './modal-notas.page';

const routes: Routes = [
  {
    path: '',
    component: ModalNotasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModalNotasPageRoutingModule {}
