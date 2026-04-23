import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { CashMovement, MOVEMENT_LABEL, MovementType } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-movements-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatTooltipModule, MoneyPipe, StatusChipComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Cash movements</h1>
          <div class="sub">Everything in flight and everything posted</div>
        </div>
        <button mat-flat-button color="primary" routerLink="/movements/new">
          <mat-icon>add</mat-icon> New movement
        </button>
      </div>

      <div class="card">
        <div class="card-hd">
          <div style="display:flex; gap: 8px; align-items:center;">
            <span class="pill-tab" [class.active]="!typeFilter" (click)="typeFilter=undefined; reload()">All types</span>
            <span class="pill-tab" *ngFor="let t of types"
                  [class.active]="typeFilter === t"
                  (click)="typeFilter = t; reload()">{{ label(t) }}</span>
          </div>
          <mat-form-field subscriptSizing="dynamic" style="width: 200px;">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="reload()">
              <mat-option [value]="undefined">Any</mat-option>
              <mat-option *ngFor="let s of statuses" [value]="s">{{ s }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="table-wrap">
          <table class="enterprise">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th style="text-align:right">Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>GL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of rows">
                <td class="mono"><a [routerLink]="['/movements', m.id]">{{ m.reference || m.id.slice(0, 8) }}</a></td>
                <td>{{ label(m.type) }}</td>
                <td>{{ m.fromEntity?.name }}</td>
                <td>{{ m.toEntity?.name }}</td>
                <td class="num">{{ m.amount | money:m.currency }}</td>
                <td><status-chip [status]="m.status"></status-chip></td>
                <td class="muted">{{ m.createdAt | date:'MMM d, HH:mm' }}</td>
                <td class="mono">{{ m.glConfirmationId || '—' }}</td>
                <td>
                  <button mat-icon-button [routerLink]="['/movements', m.id]" matTooltip="Open">
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="!rows.length">
                <td colspan="9" class="muted" style="text-align:center; padding:48px;">
                  No movements match your filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class MovementsListComponent implements OnInit {
  private api = inject(ApiService);
  rows: CashMovement[] = [];
  typeFilter?: MovementType;
  statusFilter?: string;
  types: MovementType[] = ['CAPITAL_CALL','DISTRIBUTION','INTERNAL_TRANSFER','EXPENSE_PAYMENT','PORTCO_INVESTMENT'];
  statuses = ['DRAFT','AUTHORIZED','SUBMITTED','PENDING','POSTED','SETTLED','GL_POSTED','RETURNED','FAILED'];

  label(t: string) { return (MOVEMENT_LABEL as any)[t] || t; }
  ngOnInit() { this.reload(); }
  reload() {
    this.api.listMovements({ type: this.typeFilter, status: this.statusFilter }).subscribe((r) => (this.rows = r));
  }
}
