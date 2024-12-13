import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TitlesPage } from './titles.page';

const routes: Routes = [
  {
    path: '',
    component: TitlesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TitlesPageRoutingModule {}
