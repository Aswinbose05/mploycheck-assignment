import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, CreateUserPayload } from '../models/user.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.getCurrentUser();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-user-role': user?.role || 'General User'
    });
  }

  /**
   * Admin only: Retrieves all system users from the database
   */
  getAllUsers(delayMs: number = 0): Observable<{ success: boolean; count: number; users: User[] }> {
    let params = new HttpParams().set('role', 'Admin');
    if (delayMs > 0) {
      params = params.set('delay', delayMs.toString());
    }

    return this.http.get<{ success: boolean; count: number; users: User[] }>(
      `${environment.apiUrl}/users`,
      { headers: this.getAuthHeaders(), params }
    );
  }

  /**
   * Admin only: Creates a new user in the database
   */
  createUser(payload: CreateUserPayload): Observable<{ success: boolean; user: User; message: string }> {
    return this.http.post<{ success: boolean; user: User; message: string }>(
      `${environment.apiUrl}/users`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Admin only: Updates an existing user's details
   */
  updateUser(id: string, updates: Partial<User>): Observable<{ success: boolean; user: User; message: string }> {
    return this.http.put<{ success: boolean; user: User; message: string }>(
      `${environment.apiUrl}/users/${id}`,
      updates,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Admin only: Deletes a user from the database
   */
  deleteUser(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${environment.apiUrl}/users/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
