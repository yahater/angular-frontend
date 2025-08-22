import { Routes } from '@angular/router';
import { ExpensesComponent } from './components/expenses/expenses.component';
import { UsersComponent } from './components/users/users.component';
import { CategoriesComponent } from './components/categories/categories.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/expenses', pathMatch: 'full' },
  { path: 'expenses', component: ExpensesComponent },
  { path: 'users', component: UsersComponent },
  { path: 'categories', component: CategoriesComponent }
];