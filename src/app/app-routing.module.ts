import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'titles',
    loadChildren: () =>
      import('./pages/titles/titles.module').then((m) => m.TitlesPageModule),
    canActivate: [AuthGuard], // Protegido pelo AuthGuard
  },
  {
    path: 'chapters/:titleId',
    loadChildren: () =>
      import('./pages/chapters/chapters.module').then(
        (m) => m.ChaptersPageModule
      ),
    canActivate: [AuthGuard], // Protegido pelo AuthGuard
  },
  {
    path: 'articles/:sectionId',
    loadChildren: () =>
      import('./pages/articles/articles.module').then(
        (m) => m.ArticlesPageModule
      ),
    canActivate: [AuthGuard],
  },
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
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
