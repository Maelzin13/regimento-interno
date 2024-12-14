import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'titles',
    loadChildren: () =>
      import('./pages/titles/titles.module').then((m) => m.TitlesPageModule),
  },
  {
    path: 'chapters/:titleId',
    loadChildren: () =>
      import('./pages/chapters/chapters.module').then(
        (m) => m.ChaptersPageModule
      ),
  },
  {
    path: 'sections/:chapterId',
    loadChildren: () =>
      import('./pages/sections/sections.module').then(
        (m) => m.SectionsPageModule
      ),
  },
  {
    path: 'articles/:sectionId',
    loadChildren: () =>
      import('./pages/articles/articles.module').then(
        (m) => m.ArticlesPageModule
      ),
  },
  {
    path: 'details/:articleId',
    loadChildren: () =>
      import('./pages/details/details.module').then((m) => m.DetailsPageModule),
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home.module').then((m) => m.HomePageModule),
  },
  {
    path: 'view-text/:id',
    loadChildren: () =>
      import('./pages/view-text/view-text.module').then(
        (m) => m.ViewTextPageModule
      ),
  },
  {
    path: 'modal',
    loadChildren: () =>
      import('./pages/modal/modal.module').then((m) => m.ModalPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
