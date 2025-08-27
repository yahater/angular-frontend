// Updated expenses.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  constructor(private supabaseService: SupabaseService) {}

  getExpenses(): Observable<any> {
    return from(
      this.supabaseService.client
        .from('expenses')
        .select(`
          *,
          users(id, name, email),
          categories(id, name)
        `)
        .order('added_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }

  createExpense(expense: { 
    user_id: number; 
    category_id: number; 
    amount: number; 
    description?: string; 
    created_at: string; 
    split_type: string; 
    paid?: boolean 
  }): Observable<any> {
    return from(
      this.supabaseService.client
        .from('expenses')
        .insert(expense)
        .select(`
          *,
          categories(id, name),
          users(id, name, email)
        `)
        .then(({ data, error }) => {
          if (error) throw error;
          return data?.[0];
        })
    );
  }

  updateExpense(id: string, expense: any): Observable<any> {
    return from(
      this.supabaseService.client
        .from('expenses')
        .update(expense)
        .eq('id', parseInt(id))
        .select(`
          *,
          users(id, name, email),
          categories(id, name)
        `)
        .then(({ data, error }) => {
          if (error) throw error;
          return data?.[0];
        })
    );
  }

  deleteExpense(id: string): Observable<any> {
    return from(
      this.supabaseService.client
        .from('expenses')
        .delete()
        .eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) throw error;
          return { success: true };
        })
    );
  }
}