import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { JournalEntry } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

@Component({
  selector: 'app-gl',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MoneyPipe],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1>GL postings — Investran</h1>
        <div class="sub">Double-entry journals auto-posted on movement settlement</div>
      </div>
      <button mat-stroked-button>
        <mat-icon>download</mat-icon> Export JE batch
      </button>
    </div>

    <div class="card" *ngFor="let j of journals; let i = index" style="margin-bottom: 16px;">
      <div class="card-hd">
        <div>
          <div class="title">{{ j.reference || 'Journal ' + (i+1) }} · <span class="mono" style="color:var(--muted); font-weight:500;">{{ j.confirmationId }}</span></div>
          <div class="desc">Posted {{ j.postedAt | date:'medium' }} · {{ j.lines.length }} lines · {{ j.currency }}</div>
        </div>
        <span class="status-chip s-GL_POSTED"><span class="material-symbols-rounded">check_circle</span> Posted</span>
      </div>
      <div class="table-wrap">
        <table class="enterprise">
          <thead>
            <tr><th>Account</th><th>Entity</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of j.lines">
              <td class="mono">{{ l.account }}</td>
              <td>{{ l.entityName }}</td>
              <td>{{ l.description }}</td>
              <td class="num">{{ l.debit ? (l.debit | money:j.currency) : '' }}</td>
              <td class="num">{{ l.credit ? (l.credit | money:j.currency) : '' }}</td>
            </tr>
            <tr style="font-weight: 600; background: var(--surface-2);">
              <td colspan="3" style="text-align:right;">Totals</td>
              <td class="num">{{ j.totals.debit | money:j.currency }}</td>
              <td class="num">{{ j.totals.credit | money:j.currency }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div *ngIf="!journals.length" class="card">
      <div class="card-bd muted" style="text-align:center; padding:48px;">
        No journals posted yet. Settle a movement to see it here.
      </div>
    </div>
  </div>
  `,
})
export class GlComponent implements OnInit {
  private api = inject(ApiService);
  journals: JournalEntry[] = [];
  ngOnInit() { this.api.listPostings().subscribe((r) => this.journals = r); }
}
