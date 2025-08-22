import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="container">
      <nav class="navbar">
        <h1>💰 Household Expense Tracker</h1>
        <div class="nav-links">
          <a routerLink="/expenses" routerLinkActive="active">Expenses</a>
          <a routerLink="/users" routerLinkActive="active">Users</a>
          <a routerLink="/categories" routerLinkActive="active">Categories</a>
        </div>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    h1 {
      color: white;
      margin: 0;
      font-size: 1.5rem;
    }
    .nav-links {
      display: flex;
      gap: 1rem;
    }
    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    .nav-links a:hover,
    .nav-links a.active {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class AppComponent {
  title = 'expense-tracker';
}