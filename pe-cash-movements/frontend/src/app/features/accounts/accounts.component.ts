import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { PlaidLinkService } from '../../core/plaid-link.service';
import { BankAccount, Entity } from '../../core/models';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatSnackBarModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Bank accounts</h1>
        <div class="sub">Linked to each entity via Plaid — used as source/destination in cash movements</div>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <mat-form-field subscriptSizing="dynamic" style="width: 280px;">
          <mat-label>Link a Plaid account to…</mat-label>
          <mat-select [(ngModel)]="linkTarget">
            <mat-option *ngFor="let e of entities" [value]="e.id">{{ e.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="startLink()" [disabled]="!linkTarget || linking">
          <mat-icon>link</mat-icon> Open Plaid Link
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-hd">
        <div class="title">Linked accounts</div>
        <div class="desc">{{ accounts.length }} bank accounts across {{ entityCount }} entities</div>
      </div>
      <div class="table-wrap">
        <table class="enterprise">
          <thead>
            <tr><th>Entity</th><th>Type</th><th>Account</th><th>Mask</th><th>Currency</th><th>Source</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of accounts">
              <td style="font-weight: 500;">{{ a.entity?.name }}</td>
              <td class="muted">{{ a.entity?.type }}</td>
              <td>{{ a.name }}</td>
              <td class="mono">••{{ a.mask }}</td>
              <td>{{ a.currency }}</td>
              <td>
                <span *ngIf="a.plaidAccountId" class="status-chip s-GL_POSTED"><span class="material-symbols-rounded">link</span> Plaid</span>
                <span *ngIf="!a.plaidAccountId" class="status-chip s-DRAFT">Seed / not linked</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `,
})
export class AccountsComponent implements OnInit {
  private api = inject(ApiService);
  private plaid = inject(PlaidLinkService);
  private snack = inject(MatSnackBar);
  entities: Entity[] = [];
  accounts: (BankAccount & { entity?: Entity })[] = [];
  linkTarget: string | null = null;
  linking = false;

  get entityCount() { return new Set(this.accounts.map((a) => a.entityId)).size; }

  ngOnInit() {
    this.api.listEntities().subscribe((r) => this.entities = r);
    this.reload();
  }
  reload() { this.api.listAccounts().subscribe((r) => this.accounts = r); }

  async startLink() {
    if (!this.linkTarget) return;
    this.linking = true;
    try {
      await this.plaid.link(this.linkTarget);
      this.snack.open('Linked — account saved', 'OK', { duration: 2500 });
      this.reload();
    } catch (e: any) {
      this.snack.open(e?.message || 'Plaid Link failed', 'OK', { duration: 4000 });
    } finally {
      this.linking = false;
    }
  }
}
