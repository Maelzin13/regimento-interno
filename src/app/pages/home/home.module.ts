import { HomePage } from './home.page';
import { NgModule } from '@angular/core';
import { MenuPage } from './menu/menu.page';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { LivroPage } from './livro/livro.page';
import { AutorPage } from './autor/autor.page';
import { PerfilPage } from './perfil/perfil.page';
import { HomePageRoutingModule } from './home-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EditBookModalPage } from '../edit-book-modal/edit-book-modal.page';
import { DescricaoModalComponent } from 'src/app/Modals/descricao-modal/descricao-modal.component';
import { StripHtmlPipe } from '../../pipes/strip-html.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    HomePageRoutingModule,
    StripHtmlPipe,
  ],
  declarations: [
    HomePage,
    MenuPage,
    LivroPage,
    PerfilPage,
    AutorPage,
    EditBookModalPage,
    DescricaoModalComponent,
  ],
})
export class HomePageModule {}
