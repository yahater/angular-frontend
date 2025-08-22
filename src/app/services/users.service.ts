import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { User } from '../models/expense.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private apiUrl = `${environment.apiBaseUrl}/users`; // backticks for template string your NestJS port
  private primaryUserIdKey = 'primaryUserId';
  
  // Subject to notify other components when primary user changes
  private primaryUserIdSubject = new BehaviorSubject<number | null>(this.getPrimaryUserId());
  public primaryUserId$ = this.primaryUserIdSubject.asObservable();
  
  constructor(private http: HttpClient) {}

  getUsers(): Observable<any> {
    return this.http.get(this.apiUrl);
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
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  addUser(user: { name: string; email: string }): Observable<any> {
    return this.http.post(this.apiUrl, user);
  }

  updateUser(id: string, user: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
