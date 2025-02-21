import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ChangePasswordPage } from './change-password.page';
import { ChangePasswordPageRoutingModule } from './change-password-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChangePasswordPageRoutingModule,
  ],
  declarations: [ChangePasswordPage],
})
export class ChangePasswordPageModule {}
