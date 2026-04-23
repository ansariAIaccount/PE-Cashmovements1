import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard',  loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'movements/new', loadComponent: () => import('./features/movements/new-movement.component').then(m => m.NewMovementComponent) },
  { path: 'movements/:id', loadComponent: () => import('./features/movements/movement-detail.component').then(m => m.MovementDetailComponent) },
  { path: 'movements',  loadComponent: () => import('./features/movements/movements-list.component').then(m => m.MovementsListComponent) },
  { path: 'entities',   loadComponent: () => import('./features/entities/entities.component').then(m => m.EntitiesComponent) },
  { path: 'accounts',   loadComponent: () => import('./features/accounts/accounts.component').then(m => m.AccountsComponent) },
  { path: 'gl',         loadComponent: () => import('./features/gl/gl.component').then(m => m.GlComponent) },
  { path: '**', redirectTo: 'dashboard' },
];
