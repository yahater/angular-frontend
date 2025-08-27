// Updated users.service.ts
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { User } from '../models/expense.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private primaryUserIdKey = 'primaryUserId';
  
  // Subject to notify other components when primary user changes
  private primaryUserIdSubject = new BehaviorSubject<number | null>(this.getPrimaryUserId());
  public primaryUserId$ = this.primaryUserIdSubject.asObservable();
  
  constructor(private supabaseService: SupabaseService) {}

  getUsers(): Observable<any> {
    return from(
      this.supabaseService.client
        .from('users')
        .select('*')
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }
  
  // Get primary user ID from localStorage
  getPrimaryUserId(): number | null {
    const storedId = localStorage.getItem(this.primaryUserIdKey);
    return storedId ? parseInt(storedId, 10) : null;
  }

  // Set primary user ID in localStorage and notify subscribers
  setPrimaryUserId(userId: number): void {
    localStorage.setItem(this.primaryUserIdKey, userId.toString());
    this.primaryUserIdSubject.next(userId);
  }
  
  getUserById(id: number): Observable<User> {
    return from(
      this.supabaseService.client
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  addUser(user: { name: string; email: string }): Observable<any> {
    return from(
      this.supabaseService.client
        .from('users')
        .insert(user)
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          return data?.[0];
        })
    );
  }

  updateUser(id: string, user: any): Observable<any> {
    return from(
      this.supabaseService.client
        .from('users')
        .update(user)
        .eq('id', parseInt(id))
        .select()
        .then(({ data, error }) => {
          if (error) throw error;
          return data?.[0];
        })
    );
  }

  deleteUser(id: string): Observable<any> {
    return from(
      this.supabaseService.client
        .from('users')
        .delete()
        .eq('id', parseInt(id))
        .then(({ error }) => {
          if (error) throw error;
          return { success: true };
        })
    );
  }
}
