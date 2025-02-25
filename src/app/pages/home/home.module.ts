import { HomePage } from './home.page';
import { QuillModule } from 'ngx-quill';
import { NgModule } from '@angular/core';
import { MenuPage } from './menu/menu.page';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { LivroPage } from './livro/livro.page';
import { SearchPage } from './search/search.page';
import { PerfilPage } from './perfil/perfil.page';
import { HomePageRoutingModule } from './home-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
    QuillModule.forRoot(),
  ],
  declarations: [
    HomePage,
    PerfilPage,
    MenuPage,
    SearchPage,
    LivroPage,
    EditBookModalPage,
  ],
})
export class HomePageModule {}
