import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecordsResponse } from '../models/record.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  private http = inject(HttpClient);

  /**
   * Fetches verification records based on current user ID, role, and optional simulated latency delay
   * 
   * @param userId The current user's ID
   * @param role 'General User' or 'Admin'
   * @param delayMs Delay in milliseconds to demonstrate asynchronous processing
   */
  getRecords(userId: string, role: string, delayMs: number = 0): Observable<RecordsResponse> {
    let params = new HttpParams()
      .set('userId', userId)
      .set('role', role);

    if (delayMs > 0) {
      params = params.set('delay', delayMs.toString());
    }

    return this.http.get<RecordsResponse>(`${environment.apiUrl}/records`, { params });
  }
}
