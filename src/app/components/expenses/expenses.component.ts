import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpensesService } from '../../services/expenses.service';
import { UsersService } from '../../services/users.service';
import { CategoriesService } from '../../services/categories.service';
import { Expense, User, Category, ExpenseCreate } from '../../models/expense.model';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss']
})
export class ExpensesComponent implements OnInit, OnDestroy {
  private expensesService = inject(ExpensesService);
  private usersService = inject(UsersService);
  private categoriesService = inject(CategoriesService);

  expenses: Expense[] = [];
  users: User[] = [];
  categories: Category[] = [];
  filteredExpenses: Expense[] = [];
  
  // Make Math available in template
  Math = Math;
  
  // Primary user subscription
  private primaryUserSubscription?: Subscription;
  
  // Form data
  newExpense: ExpenseCreate = {
    user_id: 1,
    amount: 0,
    category_id: 1,
    created_at: new Date().toISOString().split('T')[0],
    split_type: '50-50',
    description: '',
    paid: false
  };

  selectedCategory: string | number = 'all';
  showForm: boolean = false;
  balance: { user1Owes: number; user2Owes: number; netBalance: number } = {
    user1Owes: 0,
    user2Owes: 0,
    netBalance: 0
  };

  ngOnInit(): void {
    this.loadData();
    
    // Subscribe to primary user changes
    this.primaryUserSubscription = this.usersService.primaryUserId$.subscribe(
      primaryUserId => {
        if (primaryUserId && this.newExpense.user_id === 1) {
          this.newExpense.user_id = primaryUserId;
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.primaryUserSubscription) {
      this.primaryUserSubscription.unsubscribe();
    }
  }

  loadData(): void {
    // Fetch expenses, users, and categories in parallel
    forkJoin({
      expenses: this.expensesService.getExpenses(),
      users: this.usersService.getUsers(),
      categories: this.categoriesService.getCategories()
    }).subscribe({
      next: (data) => {
        // Map expenses so that each expense has a direct 'user' and 'category' object
        // instead of nested "users" and "categories" arrays/objects from the API
        this.expenses = data.expenses.map((expense: any) => ({
          ...expense,
          user: expense.users,          // attach the related user object
          category: expense.categories  // attach the related category object
        }));

        // Store users and categories for use elsewhere in the app
        this.users = data.users;
        this.categories = data.categories;

        // Set primary user as default, or first user if no primary user set
        let primaryUserId = this.usersService.getPrimaryUserId();
        
        // If no primary user is set and users exist, set first user as primary
        if (!primaryUserId && this.users.length > 0) {
          primaryUserId = this.users[0].id;
          this.usersService.setPrimaryUserId(primaryUserId);
        }
        
        // Set default user_id and category_id for a new expense form
        if (primaryUserId) this.newExpense.user_id = primaryUserId;
        if (this.categories.length > 0) this.newExpense.category_id = this.categories[0].id;

        // Sort expenses by creation date (newest first)
        this.sortExpenses();

        // Apply category filter to expenses (if any selected)
        this.filterExpenses();

        // Recalculate balances based on updated expense data
        this.calculateBalance();
      },
      // Handle API errors gracefully (log them for now)
      error: (error: any) => console.error('Error loading data:', error)
    });
  }

  sortExpenses(): void {
    // Sort expenses in descending order by creation date
    this.expenses.sort(
      (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
    );
  }

  filterExpenses(): void {
    // If "all" is selected, show all expenses
    if (this.selectedCategory === 'all') {
      this.filteredExpenses = [...this.expenses];
    } else {
      // Otherwise, filter by the selected category ID
      const categoryId = Number(this.selectedCategory);

      // Only keep expenses that belong to the selected category
      this.filteredExpenses = this.expenses.filter(
        (expense) => expense.category?.id === categoryId
      );
    }
  }

  // Add debugging to the category change handler
  onCategoryChange(): void {
    console.log('Category changed to:', this.selectedCategory);
    this.filterExpenses();
  }

  // Alternative approach - if you prefer to keep using category names:
  filterExpensesByName(): void {
    if (this.selectedCategory === 'all') {
      this.filteredExpenses = [...this.expenses];
    } else {
      this.filteredExpenses = this.expenses.filter(expense => {
        // Make sure category exists and compare names (case-insensitive)
        const categoryName = expense.category?.name?.toLowerCase();
        const selectedName = this.selectedCategory.toString().toLowerCase();
        return categoryName === selectedName;
      });
    }
  }

  // Calculate balances for the two users
  calculateBalance(): void {
    // Extract the first two user IDs (assumes only 2 users in the app)
    const user1Id = this.users?.[0]?.id;
    const user2Id = this.users?.[1]?.id;

    // If we don't have both users, reset balance and exit
    if (user1Id == null || user2Id == null) {
      this.balance = { user1Owes: 0, user2Owes: 0, netBalance: 0 };
      return;
    }

    // Work only with unpaid expenses (ignore already settled ones)
    const unpaidExpenses = (this.expenses ?? []).filter(e => !e.paid);

    // Running totals for how much each user owes
    let user1Owes = 0;
    let user2Owes = 0;

    // Loop through every unpaid expense
    for (const e of unpaidExpenses) {
      // Normalize payer (sometimes stored as user_id, sometimes inside user object)
      const payerRaw = e.user_id ?? e.user?.id;
      const payerId = payerRaw != null ? Number(payerRaw) : NaN;

      // Normalize amount (force to number in case it comes as string)
      const amount = Number(e.amount);

      // Normalize split type (trim + lowercase to make matching more robust)
      const split = (e.split_type ?? '').trim().toLowerCase();

      // Skip invalid rows (NaN payer or amount)
      if (Number.isNaN(amount) || Number.isNaN(payerId)) {
        continue;
      }

      // Flags to check who paid
      const isUser1Payer = payerId === Number(user1Id);
      const isUser2Payer = payerId === Number(user2Id);

      // Case 1: Split evenly
      if (split === '50-50' || split === '50/50') {
        const half = amount / 2;
        if (isUser1Payer) {
          // If user1 paid, then user2 owes half
          user2Owes += half;
        } else if (isUser2Payer) {
          // If user2 paid, then user1 owes half
          user1Owes += half;
        }

      // Case 2: Payer covers everything for the other person
      } else if (split === '100-other' || split === '100% other' || split === '100_other') {
        if (isUser1Payer) {
          // User1 paid full, so user2 owes full amount
          user2Owes += amount;
        } else if (isUser2Payer) {
          // User2 paid full, so user1 owes full amount
          user1Owes += amount;
        }
      }
    }

    // Net balance: positive = user2 owes more, negative = user1 owes more
    const netBalance = user2Owes - user1Owes;

    // Save results in the component's state
    this.balance = { user1Owes, user2Owes, netBalance };
  }

  // Add a new expense
  addExpense(): void {
    // Prepare payload (only send IDs, not full user/category objects)
    const payload = {
      ...this.newExpense,
      user_id: this.newExpense.user_id,
      category_id: this.newExpense.category_id
    };

    // Call API to create new expense
    this.expensesService.createExpense(payload).subscribe({
      next: () => {
        // Reload updated data, reset form, and hide form
        this.loadData();
        this.resetForm();
        this.showForm = false;
      },
      error: (error: any) => console.error('Error creating expense:', error)
    });
  }

  // Toggle the "paid" status of an expense
  togglePaid(expense: Expense): void {
    this.expensesService.updateExpense(expense.id.toString(), { paid: !expense.paid }).subscribe({
      next: () => {
        // Reload updated data after toggle
        this.loadData();
      },
      error: (error: any) => console.error('Error updating expense:', error)
    });
  }

  // Delete an expense warning popup
  deleteExpense(id: number): void {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.expensesService.deleteExpense(id.toString()).subscribe({
        next: () => {
          // Reload updated data after deletion
          this.loadData();
        },
        error: (error: any) => console.error('Error deleting expense:', error)
      });
    }
  }

  // Reset new expense form to defaults
  resetForm(): void {
    // Get primary user or default to first user
    const primaryUserId = this.usersService.getPrimaryUserId();
    const defaultUserId = primaryUserId || (this.users.length > 0 ? this.users[0].id : 1);
    
    this.newExpense = {
      user_id: defaultUserId, // use primary user or first user
      amount: 0,
      category_id: this.categories.length > 0 ? this.categories[0].id : 1, // default to first category
      created_at: new Date().toISOString().split('T')[0], // today's date
      split_type: '50-50', // default split
      description: '',
      paid: false // new expenses start unpaid
    };
  }

  // Toggle form and ensure primary user is selected when opening
  toggleForm(): void {
    if (!this.showForm) {
      this.showForm = true;
      const primaryUserId = this.usersService.getPrimaryUserId();
      if (primaryUserId) {
        this.newExpense.user_id = primaryUserId;
      }
    } else {
      this.showForm = false;
    }
  }

  // Hot button presets
  usePreset(presetType: 'hofer' | 'apotheke' | 'bipa'): void {
    // Set primary user as default
    const primaryUserId = this.usersService.getPrimaryUserId();
    if (primaryUserId) {
      this.newExpense.user_id = primaryUserId;
    }

    // Set today's date
    this.newExpense.created_at = new Date().toISOString().split('T')[0];
    
    // Set default split type
    this.newExpense.split_type = '50-50';
    
    // Set amount to 0 (user needs to fill this)
    this.newExpense.amount = 0;

    switch (presetType) {
      case 'hofer':
        this.newExpense.description = 'Hofer/Spar';
        this.newExpense.category_id = this.getCategoryIdByName('groceries') || this.categories[0]?.id || 1;
        break;
      case 'apotheke':
        this.newExpense.description = 'Apotheke';
        this.newExpense.category_id = this.getCategoryIdByName('health') || this.categories[0]?.id || 1;
        break;
      case 'bipa':
        this.newExpense.description = 'Bipa/Dm';
        this.newExpense.category_id = this.getCategoryIdByName('health') || this.categories[0]?.id || 1;
        break;
    }

    // Show the form
    this.showForm = true;
  }

  // Helper function to get category ID by name (case-insensitive)
  private getCategoryIdByName(categoryName: string): number | null {
    const category = this.categories.find(cat => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    return category ? category.id : null;
  }

  // Get category icon based on category name
  getCategoryIcon(categoryName: string | undefined): string {
    if (!categoryName) return '📋';
    
    const name = categoryName.toLowerCase();
    
    // Icon mappings
    if (name.includes('rent') || name.includes('housing')) return '🏠';
    if (name.includes('food') || name.includes('groceries') || name.includes('grocery')) return '🥬';
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) return '💊';
    if (name.includes('transport') || name.includes('car') || name.includes('gas')) return '🚗';
    if (name.includes('entertainment') || name.includes('fun')) return '🎬';
    if (name.includes('utilities') || name.includes('electricity') || name.includes('water')) return '⚡';
    if (name.includes('shopping') || name.includes('clothes') || name.includes('clothing')) return '🛍️';
    if (name.includes('restaurant') || name.includes('dining')) return '🍽️';
    if (name.includes('travel') || name.includes('vacation')) return '✈️';
    if (name.includes('education') || name.includes('school')) return '📚';
    if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return '🏋️';
    if (name.includes('pet') || name.includes('animal')) return '🐕';
    
    // Default icon
    return '📋';
  }

  // Get category color based on category name
  getCategoryColor(categoryName: string | undefined): string {
    if (!categoryName) return '#6B7280';
    
    const name = categoryName.toLowerCase();
    
    // Color mappings - using vibrant, distinct colors
    if (name.includes('rent') || name.includes('housing')) return '#8B5CF6'; // Purple
    if (name.includes('food') || name.includes('groceries') || name.includes('grocery')) return '#10B981'; // Green
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) return '#3B82F6'; // Blue
    if (name.includes('transport') || name.includes('car') || name.includes('gas')) return '#F59E0B'; // Amber
    if (name.includes('entertainment') || name.includes('fun')) return '#EF4444'; // Red
    if (name.includes('utilities') || name.includes('electricity') || name.includes('water')) return '#06B6D4'; // Cyan
    if (name.includes('shopping') || name.includes('clothes') || name.includes('clothing')) return '#EC4899'; // Pink
    if (name.includes('restaurant') || name.includes('dining')) return '#F97316'; // Orange
    if (name.includes('travel') || name.includes('vacation')) return '#84CC16'; // Lime
    if (name.includes('education') || name.includes('school')) return '#6366F1'; // Indigo
    if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return '#14B8A6'; // Teal
    if (name.includes('pet') || name.includes('animal')) return '#A855F7'; // Violet
    
    // Default color
    return '#6B7280'; // Gray
  }

  // Get amount color class based on primary user and who paid
  getAmountColorClass(expense: Expense): string {
    if (expense.paid) return 'amount-paid-settled'; // Neutral color for settled expenses
    
    const primaryUserId = this.usersService.getPrimaryUserId();
    const expenseUserId = expense.user_id ?? expense.user?.id;
    
    if (!primaryUserId) return 'amount-neutral';
    
    const primaryUserPaid = Number(expenseUserId) === Number(primaryUserId);
    
    if (expense.split_type === '50-50') {
      // In 50-50 split, primary user always owes something regardless of who paid
      // Green if primary user paid (they're owed back), red if they didn't pay (they owe)
      return primaryUserPaid ? 'amount-owed-to-me' : 'amount-i-owe';
    } else if (expense.split_type === '100-other') {
      // In 100-other, whoever paid covers it all for the other person
      // Green if primary user paid (other owes them), red if other paid (primary owes)
      return primaryUserPaid ? 'amount-owed-to-me' : 'amount-i-owe';
    }
    
    return 'amount-neutral';
  }

  // Decide which CSS class to apply for an expense amount display
  getExpenseAmountClass(expense: Expense, currentUserId: number): string {
    if (expense.paid) return 'paid'; // If settled, mark as paid

    // Get who actually paid the expense
    const expenseUserId = expense.user_id ?? expense.user?.id;
    let userOwes = false;

    // If expense is shared or fully covered by the other
    if (expense.split_type === '50-50' || expense.split_type === '100-other') {
      // Current user owes if they are not the one who paid
      userOwes = expenseUserId !== currentUserId;
    }

    // Return correct CSS class
    return userOwes ? 'owes' : 'paid-by-me';
  }

  // Get the amount to display in UI
  getDisplayAmount(expense: Expense): number {
    if (expense.split_type === '50-50') {
      // Show only half if expense is split evenly
      return expense.amount / 2;
    }
    // Otherwise show full amount
    return expense.amount;
  }
}