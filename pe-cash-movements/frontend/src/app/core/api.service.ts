import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BankAccount, CashMovement, Entity, JournalEntry, MovementType } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // --- entities
  listEntities(type?: Entity['type']): Observable<Entity[]> {
    const q = type ? `?type=${type}` : '';
    return this.http.get<Entity[]>(`${this.base}/entities${q}`);
  }

  // --- accounts
  listAccounts(entityId?: string): Observable<BankAccount[]> {
    const q = entityId ? `?entityId=${entityId}` : '';
    return this.http.get<BankAccount[]>(`${this.base}/accounts${q}`);
  }

  // --- plaid
  createLinkToken(userId = 'demo-user'): Observable<{ link_token: string; expiration: string }> {
    return this.http.post<any>(`${this.base}/plaid/link-token`, { userId });
  }
  exchangePublicToken(publicToken: string, entityId: string, metadata: any) {
    return this.http.post<any>(`${this.base}/plaid/exchange-token`, { publicToken, entityId, metadata });
  }

  // --- movements
  listMovements(filters: { status?: string; type?: MovementType } = {}): Observable<CashMovement[]> {
    const q = new URLSearchParams(filters as any).toString();
    return this.http.get<CashMovement[]>(`${this.base}/movements${q ? '?' + q : ''}`);
  }
  getMovement(id: string): Observable<CashMovement & { events: any[] }> {
    return this.http.get<any>(`${this.base}/movements/${id}`);
  }
  createMovement(payload: Partial<CashMovement>): Observable<CashMovement> {
    return this.http.post<CashMovement>(`${this.base}/movements`, payload);
  }
  authorize(id: string) { return this.http.post<CashMovement>(`${this.base}/movements/${id}/authorize`, {}); }
  submit(id: string)    { return this.http.post<CashMovement>(`${this.base}/movements/${id}/submit`, {}); }
  simulate(id: string, eventType: 'pending'|'posted'|'settled'|'returned') {
    return this.http.post<CashMovement>(`${this.base}/movements/${id}/simulate`, { eventType });
  }

  // --- gl
  listPostings(): Observable<JournalEntry[]> {
    return this.http.get<JournalEntry[]>(`${this.base}/gl/postings`);
  }
}
