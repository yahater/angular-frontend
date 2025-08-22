export interface User {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  user_id: number;
  amount: number;
  category_id: number;
  created_at: string;
  split_type: '50-50' | '100-other';
  description: string;
  paid: boolean;
  added_at: string;
  user?: User;
  category?: Category;
}

export interface ExpenseCreate {
  user_id: number;
  amount: number;
  category_id: number;
  created_at: string;
  split_type: '50-50' | '100-other';
  description: string;
  paid: boolean;
}