import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { QuestaoOrdemNovaPage } from './questao-ordem-nova.page';

const routes: Routes = [
  {
    path: '',
    component: QuestaoOrdemNovaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QuestaoOrdemNovaPageRoutingModule {}
