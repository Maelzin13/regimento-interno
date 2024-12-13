import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TitlesPageRoutingModule } from './titles-routing.module';

import { TitlesPage } from './titles.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TitlesPageRoutingModule
  ],
  declarations: [TitlesPage]
})
export class TitlesPageModule {}
