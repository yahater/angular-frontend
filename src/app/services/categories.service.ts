// Updated categories.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Category } from '../models/expense.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private supabaseService: SupabaseService) {}

  getCategories(): Observable<any> {
    return from(
      this.supabaseService.client
        .from('categories')
        .select('*')
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }

  getCategoryById(id: number): Observable<Category> {
    return from(
      this.supabaseService.client
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  addCategory(category: { name: string }): Observable<any> {
    return from(
      this.supabaseService.client
        .from('categories')
        .insert(category)
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          return data?.[0];
        })
    );
  }

  updateCategory(id: string, category: any): Observable<any> {
    return from(
      this.supabaseService.client
        .from('categories')
        .update(category)
        .eq('id', parseInt(id))
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          return data?.[0];
        })
    );
  }

  deleteCategory(id: string): Observable<any> {
    return from(
      this.supabaseService.client
        .from('categories')
        .delete()
        .eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) throw error;
          return { success: true };
        })
    );
  }
}
