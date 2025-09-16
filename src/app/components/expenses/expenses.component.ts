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
  primaryUserId?: number;
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
  balance: { user1Owes: number; user2Owes: number; netBalance: number; user1Paid: number; user2Paid: number } = {
    user1Owes: 0,
    user2Owes: 0,
    netBalance: 0,
    user1Paid: 0,
    user2Paid: 0
  };

  ngOnInit(): void {
    this.loadData();

    // Subscribe to primary user changes
    this.primaryUserSubscription = this.usersService.primaryUserId$.subscribe(id => {
      this.primaryUserId = id ?? undefined; // null → undefined
      if (this.primaryUserId && this.newExpense.user_id === 1) {
        this.newExpense.user_id = this.primaryUserId;
      }
    });
  }

  ngOnDestroy(): void {
    this.primaryUserSubscription?.unsubscribe();
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
      this.balance = { 
        user1Owes: 0, 
        user2Owes: 0, 
        netBalance: 0,
        user1Paid: 0,
        user2Paid: 0
      };
      return;
    }

    // Work only with unpaid expenses (ignore already settled ones)
    const unpaidExpenses = (this.expenses ?? []).filter(e => !e.paid);

    // Running totals
    let user1Owes = 0;
    let user2Owes = 0;
    let user1Paid = 0;
    let user2Paid = 0;

    // Loop through every unpaid expense
    for (const e of unpaidExpenses) {
      const payerRaw = e.user_id ?? e.user?.id;
      const payerId = payerRaw != null ? Number(payerRaw) : NaN;
      const amount = Number(e.amount);
      const split = (e.split_type ?? '').trim().toLowerCase();

      if (Number.isNaN(amount) || Number.isNaN(payerId)) {
        continue;
      }

      const isUser1Payer = payerId === Number(user1Id);
      const isUser2Payer = payerId === Number(user2Id);

      // Track payments
      if (isUser1Payer) {
        user1Paid += amount;
      } else if (isUser2Payer) {
        user2Paid += amount;
      }

      // Case 1: Split evenly
      if (split === '50-50' || split === '50/50') {
        const half = amount / 2;
        if (isUser1Payer) {
          user2Owes += half;
        } else if (isUser2Payer) {
          user1Owes += half;
        }

      // Case 2: Payer covers everything for the other person
      } else if (split === '100-other' || split === '100% other' || split === '100_other') {
        if (isUser1Payer) {
          user2Owes += amount;
        } else if (isUser2Payer) {
          user1Owes += amount;
        }
      }
    }

    const netBalance = user2Owes - user1Owes;

    this.balance = { user1Owes, user2Owes, netBalance, user1Paid, user2Paid };
  }

  // Add a new expense
  addExpense(): void {
    // Ensure amount is set to 0 if undefined/null before saving
    if (!this.newExpense.amount || this.newExpense.amount === null || this.newExpense.amount === undefined) {
      this.newExpense.amount = 0;
    }
    
    // Prepare payload (only send IDs, not full user/category objects)
    const payload = {
      ...this.newExpense,
      user_id: this.newExpense.user_id,
      category_id: this.newExpense.category_id,
      amount: this.newExpense.amount || 0 // Extra safety check for amount
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
  
  onAmountFocus(): void {
    // Clear the field when user focuses if it's 0
    if (this.newExpense.amount === 0) {
      this.newExpense.amount = null as any;
    }
  }
  
  onAmountBlur(): void {
    // Set to 0 if field is empty when user leaves the field
    if (!this.newExpense.amount || this.newExpense.amount === null || this.newExpense.amount === undefined) {
      this.newExpense.amount = 0;
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
    if (name.includes('food') || name.includes('groceries') || name.includes('grocery')) return '🛒';
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

  // Get the primary user's name for greeting
  getPrimaryUserName(): string {
    const primaryUserId = this.usersService.getPrimaryUserId();
    const primaryUser = this.users.find(user => user.id === primaryUserId);
    return primaryUser ? primaryUser.name : (this.users[0]?.name || 'User');
  }

  // Check if primary user is owed money (for positive balance styling)
  isPrimaryUserOwed(): boolean {
    const primaryUserId = this.usersService.getPrimaryUserId();
    if (!primaryUserId || this.users.length < 2) return false;
    
    const user1Id = this.users[0]?.id;
    const user2Id = this.users[1]?.id;
    
    if (primaryUserId === user1Id) {
      return this.balance.user2Owes > this.balance.user1Owes;
    } else if (primaryUserId === user2Id) {
      return this.balance.user1Owes > this.balance.user2Owes;
    }
    
    return false;
  }

  // Check if primary user owes money (for negative balance styling)
  isPrimaryUserOwing(): boolean {
    const primaryUserId = this.usersService.getPrimaryUserId();
    if (!primaryUserId || this.users.length < 2) return false;
    
    const user1Id = this.users[0]?.id;
    const user2Id = this.users[1]?.id;
    
    if (primaryUserId === user1Id) {
      return this.balance.user1Owes > this.balance.user2Owes;
    } else if (primaryUserId === user2Id) {
      return this.balance.user2Owes > this.balance.user1Owes;
    }
    
    return false;
  }

  // Get the net balance text from primary user's perspective
  getNetBalanceText(): string {
    const primaryUserId = this.usersService.getPrimaryUserId();
    if (!primaryUserId || this.users.length < 2) {
      return 'No balance data';
    }

    const user1Id = this.users[0]?.id;
    const user2Id = this.users[1]?.id;
    const netAmount = Math.abs(this.balance.netBalance);

    if (netAmount < 0.01) {
      return 'All settled up!';
    }

    if (primaryUserId === user1Id) {
      if (this.balance.user1Owes > this.balance.user2Owes) {
        return `You owe €${netAmount.toFixed(2)}`;
      } else {
        return `You are owed €${netAmount.toFixed(2)}`;
      }
    } else if (primaryUserId === user2Id) {
      if (this.balance.user2Owes > this.balance.user1Owes) {
        return `You owe €${netAmount.toFixed(2)}`;
      } else {
        return `You are owed €${netAmount.toFixed(2)}`;
      }
    }

    return 'Balance unknown';
  }

  // Get display amount with + or - sign for banking app style
  getDisplayAmountWithSign(expense: Expense): string {
    const primaryUserId = this.usersService.getPrimaryUserId();
    const expenseUserId = expense.user_id ?? expense.user?.id;
    
    if (!primaryUserId) {
      return `€${expense.amount.toFixed(2)}`;
    }

    const primaryUserPaid = Number(expenseUserId) === Number(primaryUserId);
    let amount = expense.amount;
    
    // For 50-50 split, show half the amount
    if (expense.split_type === '50-50') {
      amount = expense.amount / 2;
    }

    if (expense.paid) {
      return `€${amount.toFixed(2)}`;
    }

    // Determine if this is money going out (-) or coming in (+) for primary user
    if (expense.split_type === '50-50') {
      // In 50-50, if primary user didn't pay, they owe (negative)
      return primaryUserPaid ? `+€${amount.toFixed(2)}` : `-€${amount.toFixed(2)}`;
    } else if (expense.split_type === '100-other') {
      // In 100-other, if primary user didn't pay, they owe full amount (negative)
      return primaryUserPaid ? `+€${amount.toFixed(2)}` : `-€${amount.toFixed(2)}`;
    }

    return `€${amount.toFixed(2)}`;
  }

  // Updated getAmountColorClass method to work with the new banking style
  getAmountColorClass(expense: Expense): string {
    if (expense.paid) return 'amount-paid-settled';
    
    const primaryUserId = this.usersService.getPrimaryUserId();
    const expenseUserId = expense.user_id ?? expense.user?.id;
    
    if (!primaryUserId) return 'amount-neutral';
    
    const primaryUserPaid = Number(expenseUserId) === Number(primaryUserId);
    
    if (expense.split_type === '50-50') {
      // Green if primary user paid (they're owed back), red if they didn't pay (they owe)
      return primaryUserPaid ? 'amount-owed-to-me' : 'amount-i-owe';
    } else if (expense.split_type === '100-other') {
      // Green if primary user paid (other owes them), red if other paid (primary owes)
      return primaryUserPaid ? 'amount-owed-to-me' : 'amount-i-owe';
    }
    
    return 'amount-neutral';
  }

  // Updated getCategoryColor method - more subdued banking colors
  getCategoryColor(categoryName: string | undefined): string {
    if (!categoryName) return '#64748b';
    
    const name = categoryName.toLowerCase();
    
    // Subdued banking app colors
    if (name.includes('rent') || name.includes('housing')) return '#6366f1'; // Indigo
    if (name.includes('food') || name.includes('groceries') || name.includes('grocery')) return '#16a34a'; // Green
    if (name.includes('health') || name.includes('medical') || name.includes('pharmacy')) return '#3b82f6'; // Blue
    if (name.includes('transport') || name.includes('car') || name.includes('gas')) return '#f59e0b'; // Amber
    if (name.includes('entertainment') || name.includes('fun')) return '#ef4444'; // Red
    if (name.includes('utilities') || name.includes('electricity') || name.includes('water')) return '#0891b2'; // Cyan
    if (name.includes('shopping') || name.includes('clothes') || name.includes('clothing')) return '#ec4899'; // Pink
    if (name.includes('restaurant') || name.includes('dining')) return '#f97316'; // Orange
    if (name.includes('travel') || name.includes('vacation')) return '#84cc16'; // Lime
    if (name.includes('education') || name.includes('school')) return '#8b5cf6'; // Purple
    if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return '#14b8a6'; // Teal
    if (name.includes('pet') || name.includes('animal')) return '#a855f7'; // Violet
    
    return '#64748b'; // Gray
  }
  // Add this method to your component class
  getExpensesByMonth() {
    if (!this.filteredExpenses || this.filteredExpenses.length === 0) {
      return [];
    }

    // Group expenses by month/year
    const groupedExpenses = new Map<string, any[]>();
    
    this.filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.created_at);
      const monthYear = expenseDate.toLocaleString('default', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!groupedExpenses.has(monthYear)) {
        groupedExpenses.set(monthYear, []);
      }
      groupedExpenses.get(monthYear)!.push(expense);
    });

    // Convert to array and sort by date (most recent first)
    const monthGroups = Array.from(groupedExpenses.entries()).map(([monthYear, expenses]) => {
      // Sort expenses within each month by date (most recent first)
      expenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return {
        monthYear,
        expenses,
        sortDate: new Date(expenses[0].created_at) // Use first expense date for sorting months
      };
    });

    // Sort month groups by date (most recent first)
    return monthGroups.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }

}