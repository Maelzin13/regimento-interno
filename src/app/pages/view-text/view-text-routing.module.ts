import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewTextPage } from './view-text.page';

const routes: Routes = [
  {
    path: '',
    component: ViewTextPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ViewTextPageRoutingModule {}
