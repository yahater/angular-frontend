import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../models/expense.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private apiUrl = `${environment.apiBaseUrl}/expenses`; // backticks for template string your NestJS port

  constructor(private http: HttpClient) {}

  getExpenses(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createExpense(expense: { user_id: number; category_id: number; amount: number; description?: string; created_at: string; split_type: string; paid?: boolean }): Observable<any> {
    return this.http.post(this.apiUrl, expense);
  }

  updateExpense(id: string, expense: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, expense);
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
