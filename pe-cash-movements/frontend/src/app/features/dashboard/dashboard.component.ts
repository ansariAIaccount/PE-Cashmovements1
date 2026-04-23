import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { CashMovement, JournalEntry, MOVEMENT_LABEL } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MoneyPipe, StatusChipComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Treasury dashboard</h1>
          <div class="sub">Live view of cash movements and GL posting status across the fund complex</div>
        </div>
        <div style="display:flex; gap:12px;">
          <button mat-stroked-button routerLink="/accounts">
            <mat-icon>account_balance</mat-icon> Link bank (Plaid)
          </button>
          <button mat-flat-button color="primary" routerLink="/movements/new">
            <mat-icon>add</mat-icon> New movement
          </button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi">
          <div class="label">In flight</div>
          <div class="value">{{ inFlightCount }}</div>
          <div class="delta muted">{{ inFlightAmount | money }}</div>
        </div>
        <div class="kpi">
          <div class="label">Settled · 30d</div>
          <div class="value">{{ settledAmount | money }}</div>
          <div class="delta up">{{ settledCount }} movements</div>
        </div>
        <div class="kpi">
          <div class="label">GL posted · 30d</div>
          <div class="value">{{ glCount }}</div>
          <div class="delta muted">All balanced</div>
        </div>
        <div class="kpi">
          <div class="label">Exceptions</div>
          <div class="value">{{ exceptionCount }}</div>
          <div class="delta" [class.down]="exceptionCount > 0" [class.muted]="exceptionCount === 0">
            {{ exceptionCount > 0 ? 'Needs review' : 'All clear' }}
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-hd">
          <div>
            <div class="title">Recent movements</div>
            <div class="desc">Last 10 across all funds</div>
          </div>
          <a routerLink="/movements" class="pill-tab active">View all</a>
        </div>
        <div class="table-wrap">
          <table class="enterprise">
            <thead>
              <tr>
                <th>Reference</th><th>Type</th><th>From</th><th>To</th>
                <th style="text-align:right">Amount</th>
                <th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of recent">
                <td class="mono"><a [routerLink]="['/movements', m.id]">{{ m.reference || m.id.slice(0,8) }}</a></td>
                <td>{{ label(m.type) }}</td>
                <td>{{ m.fromEntity?.name }}</td>
                <td>{{ m.toEntity?.name }}</td>
                <td class="num">{{ m.amount | money:m.currency }}</td>
                <td><status-chip [status]="m.status"></status-chip></td>
                <td class="muted">{{ m.createdAt | date:'MMM d, HH:mm' }}</td>
              </tr>
              <tr *ngIf="!recent.length">
                <td colspan="7" class="muted" style="text-align:center; padding:32px;">
                  No movements yet — <a routerLink="/movements/new">create your first</a>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <div>
            <div class="title">Recent GL postings</div>
            <div class="desc">Double-entry journals sent to Investran</div>
          </div>
          <a routerLink="/gl" class="pill-tab active">Open ledger</a>
        </div>
        <div class="table-wrap">
          <table class="enterprise">
            <thead>
              <tr><th>Confirmation</th><th>Reference</th><th>Lines</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th>Posted</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let j of postings.slice(0, 5)">
                <td class="mono">{{ j.confirmationId }}</td>
                <td>{{ j.reference }}</td>
                <td>{{ j.lines.length }}</td>
                <td class="num">{{ j.totals.debit | money:j.currency }}</td>
                <td class="num">{{ j.totals.credit | money:j.currency }}</td>
                <td class="muted">{{ j.postedAt | date:'MMM d, HH:mm' }}</td>
              </tr>
              <tr *ngIf="!postings.length">
                <td colspan="6" class="muted" style="text-align:center; padding:32px;">
                  No GL postings yet — they appear automatically when movements settle.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  recent: CashMovement[] = [];
  postings: JournalEntry[] = [];
  inFlightCount = 0; inFlightAmount = 0;
  settledCount = 0;  settledAmount = 0;
  glCount = 0;       exceptionCount = 0;

  label(t: string) { return (MOVEMENT_LABEL as any)[t] || t; }

  ngOnInit() {
    this.api.listMovements().subscribe((rows) => {
      this.recent = rows.slice(0, 10);
      this.inFlightCount  = rows.filter((m) => ['SUBMITTED','PENDING','POSTED','AUTHORIZED','DRAFT'].includes(m.status)).length;
      this.inFlightAmount = rows.filter((m) => ['SUBMITTED','PENDING','POSTED'].includes(m.status))
                                .reduce((s, m) => s + m.amount, 0);
      this.settledCount   = rows.filter((m) => ['SETTLED','GL_POSTED'].includes(m.status)).length;
      this.settledAmount  = rows.filter((m) => ['SETTLED','GL_POSTED'].includes(m.status))
                                .reduce((s, m) => s + m.amount, 0);
      this.exceptionCount = rows.filter((m) => ['RETURNED','FAILED','AUTH_DECLINED'].includes(m.status)).length;
    });
    this.api.listPostings().subscribe((rows) => {
      this.postings = rows;
      this.glCount = rows.length;
    });
  }
}
