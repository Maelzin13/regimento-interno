import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomePage } from 'src/app/pages/home/home.page';
import { UserPage } from 'src/app/pages/user/user.page';
import { MenuPage } from 'src/app/pages/home/menu/menu.page';
import { LivroPage } from 'src/app/pages/home/livro/livro.page';
import { SearchPage } from 'src/app/pages/home/search/search.page';
import { PerfilPage } from 'src/app/pages/home/perfil/perfil.page';
import { PagamentoPage } from 'src/app/pages/pagamento/pagamento.page';
import { ChangePasswordPage } from 'src/app/pages/change-password/change-password.page';

const routes: Routes = [
  {
    path: '',
    component: HomePage,
    children: [
      {
        path: 'book',
        component: LivroPage,
      },
      {
        path: 'perfil',
        component: PerfilPage,
      },
      {
        path: 'search',
        component: SearchPage,
      },
      {
        path: 'menu',
        component: MenuPage,
      },
      {
        path: 'menu/users',
        component: UserPage,
      },
      {
        path: 'menu/pagamentos',
        component: PagamentoPage,
      },
      {
        path: 'menu/change-password',
        component: ChangePasswordPage,
      },
      {
        path: '',
        redirectTo: 'book',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HomePageRoutingModule {}
