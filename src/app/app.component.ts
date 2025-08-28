import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="container">
      <nav class="navbar">
        <h1>💰 Expense Tracker</h1>
        <div class="nav-links">
          <a routerLink="/expenses" routerLinkActive="active">Expenses</a>
          <a routerLink="/users" routerLinkActive="active">Users</a>
        </div>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .container {
      min-height: 100vh;
      background: linear-gradient(135deg, #8d99ae 0%, #6f7b95 100%);
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
    }
    
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #8e9aaf 0%, #6d7993 100%);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
    }
    
    h1 {
      color: white;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
    }
    
    .nav-links {
      display: flex;
      gap: 0.5rem;
    }
    
    .nav-links a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      transition: all 0.3s ease;
      font-size: 0.9rem;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(5px);
      white-space: nowrap;
    }
    
    .nav-links a:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    .nav-links a.active {
      background: rgba(255, 255, 255, 0.25);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
      .navbar {
        padding: 0.75rem 1rem;
        flex-wrap: nowrap;
      }
      
      h1 {
        font-size: 1.2rem;
        flex-shrink: 0;
      }
      
      .nav-links {
        gap: 0.25rem;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      
      .nav-links::-webkit-scrollbar {
        display: none;
      }
      
      .nav-links a {
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
        border-radius: 16px;
        flex-shrink: 0;
      }
    }
    
    @media (max-width: 480px) {
      .navbar {
        padding: 0.5rem 0.75rem;
        flex-direction: column;
        gap: 0.75rem;
        align-items: center;
      }
      
      h1 {
        font-size: 1.1rem;
      }
      
      .nav-links {
        width: 100%;
        justify-content: center;
        gap: 0.5rem;
      }
      
      .nav-links a {
        flex: 1;
        text-align: center;
        padding: 0.5rem 0.5rem;
        font-size: 0.75rem;
        max-width: 100px;
      }
    }
  `]
})
export class AppComponent {
  title = 'expense-tracker';
}