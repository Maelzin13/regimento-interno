import { UserPage } from './user.page';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { UserPageRoutingModule } from './user-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, UserPageRoutingModule],
  declarations: [UserPage],
})
export class UserPageModule {}
