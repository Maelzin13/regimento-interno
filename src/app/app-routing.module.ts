import { NgModule } from '@angular/core';
import { AuthGuard } from './guards/auth.guard';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home.module').then((m) => m.HomePageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'view-text/:id',
    loadChildren: () =>
      import('./pages/view-text/view-text.module').then(
        (m) => m.ViewTextPageModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'modal',
    loadChildren: () =>
      import('./pages/modal/modal.module').then((m) => m.ModalPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./pages/user/user.module').then((m) => m.UserPageModule),
  },
  {
    path: 'user-edit/:id',
    loadChildren: () =>
      import('./pages/user-edit/user-edit.module').then(
        (m) => m.UserEditPageModule
      ),
  },
  {
    path: 'pagamento',
    loadChildren: () =>
      import('./pages/pagamento/pagamento.module').then(
        (m) => m.PagamentoPageModule
      ),
  },
  {
    path: 'change',
    loadChildren: () =>
      import('./pages/change-password/change-password.module').then(
        (m) => m.ChangePasswordPageModule
      ),
  }, 
  {
    path: 'plans',
    loadChildren: () =>
      import('./pages/plans/plans.module').then((m) => m.PlansPageModule),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./pages/dashboard/dashboard.module').then(
        (m) => m.DashboardPageModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
