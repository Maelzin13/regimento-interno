import { HomePage } from './home.page';
import { NgModule } from '@angular/core';
import { MenuPage } from './menu/menu.page';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { LivroPage } from './livro/livro.page';
import { PerfilPage } from './perfil/perfil.page';
import { HomePageRoutingModule } from './home-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    HomePageRoutingModule,
  ],
  declarations: [HomePage, MenuPage, LivroPage, PerfilPage, EditBookModalPage],
})
export class HomePageModule {}
