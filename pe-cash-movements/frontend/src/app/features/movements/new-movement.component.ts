import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { BankAccount, Entity, MOVEMENT_LABEL, MovementType } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';

interface TypeOption { type: MovementType; label: string; icon: string; desc: string; from: Entity['type']; to: Entity['type']; }

@Component({
  selector: 'app-new-movement',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatStepperModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCardModule, MatDividerModule, MatChipsModule,
    MatSnackBarModule, MoneyPipe],
  template: `
  <div class="page" style="max-width: 960px;">
    <div class="page-header">
      <div>
        <h1>New cash movement</h1>
        <div class="sub">Initiate, authorize via Plaid, settle, post to Investran GL</div>
      </div>
      <a mat-stroked-button routerLink="/movements"><mat-icon>close</mat-icon> Cancel</a>
    </div>

    <mat-stepper linear #stepper class="card" style="background: transparent;">
      <!-- Step 1 — Movement type -->
      <mat-step [completed]="!!form.value.type" [editable]="true" label="Type">
        <div class="card-bd">
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <button *ngFor="let t of typeOptions"
              type="button"
              class="type-tile"
              [class.selected]="form.value.type === t.type"
              (click)="chooseType(t, stepper)">
              <div class="ic"><mat-icon>{{ t.icon }}</mat-icon></div>
              <div class="tx">
                <div class="title">{{ t.label }}</div>
                <div class="desc">{{ t.desc }}</div>
              </div>
            </button>
          </div>
        </div>
      </mat-step>

      <!-- Step 2 — From / To -->
      <mat-step [stepControl]="fromToGroup" label="From & To">
        <div class="card-bd" [formGroup]="fromToGroup">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <mat-form-field>
              <mat-label>{{ currentType?.from === 'LP' ? 'From (LP)' : 'From (' + currentType?.from + ')' }}</mat-label>
              <mat-select formControlName="fromEntityId" (selectionChange)="loadAccounts('from', $event.value)">
                <mat-option *ngFor="let e of fromEntities" [value]="e.id">{{ e.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>From bank account</mat-label>
              <mat-select formControlName="fromAccountId">
                <mat-option *ngFor="let a of fromAccounts" [value]="a.id">
                  {{ a.name }} · ••{{ a.mask }}
                </mat-option>
              </mat-select>
              <mat-hint *ngIf="!fromAccounts.length && fromToGroup.value.fromEntityId">No linked accounts — use Plaid Link in Bank Accounts.</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ currentType?.to === 'PORTCO' ? 'To (Portfolio company)' : 'To (' + currentType?.to + ')' }}</mat-label>
              <mat-select formControlName="toEntityId" (selectionChange)="loadAccounts('to', $event.value)">
                <mat-option *ngFor="let e of toEntities" [value]="e.id">{{ e.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>To bank account</mat-label>
              <mat-select formControlName="toAccountId">
                <mat-option *ngFor="let a of toAccounts" [value]="a.id">
                  {{ a.name }} · ••{{ a.mask }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div style="margin-top: 12px; display:flex; gap:8px; justify-content:flex-end;">
            <button mat-stroked-button matStepperPrevious>Back</button>
            <button mat-flat-button color="primary" matStepperNext [disabled]="fromToGroup.invalid">Continue</button>
          </div>
        </div>
      </mat-step>

      <!-- Step 3 — Amount -->
      <mat-step [stepControl]="amountGroup" label="Amount & reference">
        <div class="card-bd" [formGroup]="amountGroup">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <mat-form-field>
              <mat-label>Amount</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="2,500,000.00" />
              <span matTextPrefix>$&nbsp;</span>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Currency</mat-label>
              <mat-select formControlName="currency">
                <mat-option value="USD">USD</mat-option>
                <mat-option value="EUR">EUR</mat-option>
                <mat-option value="GBP">GBP</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Reference</mat-label>
              <input matInput formControlName="reference" placeholder="Call #7 · Fund II" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Memo (optional)</mat-label>
              <input matInput formControlName="memo" />
            </mat-form-field>
          </div>
          <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
            <button mat-stroked-button matStepperPrevious>Back</button>
            <button mat-flat-button color="primary" matStepperNext [disabled]="amountGroup.invalid">Review</button>
          </div>
        </div>
      </mat-step>

      <!-- Step 4 — Review -->
      <mat-step label="Review & submit">
        <div class="card-bd">
          <h3 style="margin-top:0;">Review</h3>
          <div class="review-grid">
            <div><span class="lbl">Type</span><span>{{ label(form.value.type!) }}</span></div>
            <div><span class="lbl">From</span><span>{{ entityName(form.value.fromEntityId) }}</span></div>
            <div><span class="lbl">From acct</span><span>{{ accountLabel(fromAccounts, form.value.fromAccountId) }}</span></div>
            <div><span class="lbl">To</span><span>{{ entityName(form.value.toEntityId) }}</span></div>
            <div><span class="lbl">To acct</span><span>{{ accountLabel(toAccounts, form.value.toAccountId) }}</span></div>
            <div><span class="lbl">Amount</span><span class="mono" style="font-weight:600;">{{ form.value.amount | money:form.value.currency }}</span></div>
            <div><span class="lbl">Reference</span><span>{{ form.value.reference }}</span></div>
            <div><span class="lbl">Memo</span><span>{{ form.value.memo || '—' }}</span></div>
          </div>

          <div style="margin-top: 16px; padding: 12px 16px; background: #eef4ff; border: 1px solid #d9e2ff; border-radius: 10px; color: #25346f; font-size: 13px; display:flex; gap:10px; align-items:flex-start;">
            <mat-icon style="color:#3f51b5;">shield</mat-icon>
            <div>
              <strong>What happens on submit</strong> — Plaid authorizes the ACH, creates the transfer, and emits status webhooks. On <em>settled</em>, a balanced JE is posted to Investran GL.
            </div>
          </div>

          <div style="margin-top: 16px; display:flex; gap:8px; justify-content:flex-end;">
            <button mat-stroked-button matStepperPrevious [disabled]="submitting">Back</button>
            <button mat-flat-button color="primary" (click)="submit()" [disabled]="submitting">
              <mat-icon>send</mat-icon> Authorize & submit
            </button>
          </div>
        </div>
      </mat-step>
    </mat-stepper>
  </div>
  `,
  styles: [`
    .type-tile {
      text-align: left; padding: 16px; border-radius: 12px;
      background: var(--surface); border: 1px solid var(--border);
      display: flex; gap: 14px; align-items: flex-start;
      cursor: pointer; transition: all .15s ease;
    }
    .type-tile:hover { border-color: var(--brand); box-shadow: var(--shadow-2); transform: translateY(-1px); }
    .type-tile.selected { border-color: var(--brand); background: #f4f6ff; }
    .type-tile .ic { width: 40px; height: 40px; border-radius: 10px; background: #eef1ff; color: var(--brand);
                     display:grid; place-items:center; flex: 0 0 auto; }
    .type-tile .ic mat-icon { color: var(--brand); }
    .type-tile .title { font-weight: 600; font-size: 14px; }
    .type-tile .desc  { color: var(--muted); font-size: 12.5px; margin-top: 2px; }
    .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; }
    .review-grid > div { display:flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--border); }
    .review-grid .lbl { color: var(--muted); font-size: 12px; }
  `],
})
export class NewMovementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  typeOptions: TypeOption[] = [
    { type: 'CAPITAL_CALL',      label: 'Capital call',      icon: 'call_received',    desc: 'Pull funds from an LP into a fund',            from: 'LP',     to: 'FUND'   },
    { type: 'DISTRIBUTION',      label: 'Distribution',      icon: 'call_made',        desc: 'Pay distribution from a fund to an LP',        from: 'FUND',   to: 'LP'     },
    { type: 'INTERNAL_TRANSFER', label: 'Internal transfer', icon: 'swap_horiz',       desc: 'Move cash between fund / mgmt co entities',    from: 'FUND',   to: 'FUND'   },
    { type: 'EXPENSE_PAYMENT',   label: 'Expense / vendor',  icon: 'receipt',          desc: 'Pay a vendor (legal, audit, admin, …)',        from: 'FUND',   to: 'VENDOR' },
    { type: 'PORTCO_INVESTMENT', label: 'PortCo investment', icon: 'trending_up',      desc: 'Deploy capital into a portfolio company',      from: 'FUND',   to: 'PORTCO' },
  ];

  fromEntities: Entity[] = []; toEntities: Entity[] = [];
  fromAccounts: BankAccount[] = []; toAccounts: BankAccount[] = [];
  submitting = false;

  // Flat form kept for state; stepper step groups below are created once and re-used.
  form = this.fb.group({
    type: this.fb.control<MovementType | null>(null, Validators.required),
    fromEntityId: this.fb.control<string | null>(null, Validators.required),
    fromAccountId: this.fb.control<string | null>(null, Validators.required),
    toEntityId: this.fb.control<string | null>(null, Validators.required),
    toAccountId: this.fb.control<string | null>(null),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    currency: this.fb.control<string>('USD', Validators.required),
    reference: this.fb.control<string>('', Validators.required),
    memo: this.fb.control<string>(''),
  });

  fromToGroup = this.fb.group({
    fromEntityId: this.form.controls.fromEntityId,
    fromAccountId: this.form.controls.fromAccountId,
    toEntityId: this.form.controls.toEntityId,
    toAccountId: this.form.controls.toAccountId,
  });
  amountGroup = this.fb.group({
    amount: this.form.controls.amount,
    currency: this.form.controls.currency,
    reference: this.form.controls.reference,
    memo: this.form.controls.memo,
  });

  get currentType() { return this.typeOptions.find((t) => t.type === this.form.value.type); }

  ngOnInit() {}

  chooseType(t: TypeOption, stepper: any) {
    this.form.patchValue({ type: t.type });
    this.api.listEntities(t.from).subscribe((e) => (this.fromEntities = e));
    this.api.listEntities(t.to).subscribe((e) => (this.toEntities = e));
    setTimeout(() => stepper.next(), 120);
  }

  loadAccounts(which: 'from' | 'to', entityId: string) {
    this.api.listAccounts(entityId).subscribe((accts) => {
      if (which === 'from') this.fromAccounts = accts;
      else this.toAccounts = accts;
    });
  }

  label(t: string) { return (MOVEMENT_LABEL as any)[t] || t; }
  entityName(id: string | null | undefined) {
    return [...this.fromEntities, ...this.toEntities].find((e) => e.id === id)?.name || '—';
  }
  accountLabel(accts: BankAccount[], id: string | null | undefined) {
    const a = accts.find((x) => x.id === id);
    return a ? `${a.name} · ••${a.mask}` : '—';
  }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.api.createMovement(this.form.value as any).subscribe({
      next: (m) => {
        this.api.authorize(m.id).subscribe({
          next: (auth) => {
            if (auth.status === 'AUTHORIZED') {
              this.api.submit(m.id).subscribe({
                next: () => {
                  this.snack.open('Submitted to Plaid — tracking status', 'OK', { duration: 3000 });
                  this.router.navigate(['/movements', m.id]);
                },
                error: (e) => this.fail(e),
              });
            } else {
              this.snack.open('Authorization declined', 'OK', { duration: 4000 });
              this.router.navigate(['/movements', m.id]);
            }
          },
          error: (e) => this.fail(e),
        });
      },
      error: (e) => this.fail(e),
    });
  }
  private fail(e: any) {
    this.submitting = false;
    this.snack.open(e?.error?.error || e?.message || 'Failed', 'OK', { duration: 5000 });
  }
}
