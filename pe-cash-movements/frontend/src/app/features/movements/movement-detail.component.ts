import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { ApiService } from '../../core/api.service';
import { CashMovement, MOVEMENT_LABEL } from '../../core/models';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

@Component({
  selector: 'app-movement-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatSnackBarModule, MoneyPipe, StatusChipComponent],
  template: `
  <div class="page" style="max-width: 1100px;" *ngIf="m">
    <div class="page-header">
      <div>
        <h1>{{ m.reference || 'Movement ' + m.id.slice(0,8) }}</h1>
        <div class="sub">{{ label(m.type) }} · created {{ m.createdAt | date:'medium' }}</div>
      </div>
      <div style="display:flex; gap:8px;">
        <status-chip [status]="m.status"></status-chip>
        <a mat-stroked-button routerLink="/movements"><mat-icon>list</mat-icon> All movements</a>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 24px;">
      <div>
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-hd"><div class="title">Details</div></div>
          <div class="card-bd">
            <div class="detail-grid">
              <div><span class="lbl">From</span><span>{{ m.fromEntity?.name }} <span class="muted">({{ m.fromEntity?.type }})</span></span></div>
              <div><span class="lbl">From bank</span><span>{{ m.fromAccount?.name }} · ••{{ m.fromAccount?.mask }}</span></div>
              <div><span class="lbl">To</span><span>{{ m.toEntity?.name }} <span class="muted">({{ m.toEntity?.type }})</span></span></div>
              <div><span class="lbl">To bank</span><span>{{ m.toAccount?.name || '—' }} <span *ngIf="m.toAccount">· ••{{ m.toAccount.mask }}</span></span></div>
              <div><span class="lbl">Amount</span><span class="mono" style="font-weight:600;">{{ m.amount | money:m.currency }}</span></div>
              <div><span class="lbl">Memo</span><span>{{ m.memo || '—' }}</span></div>
              <div><span class="lbl">Plaid authorization</span><span class="mono">{{ m.authorizationId || '—' }}</span></div>
              <div><span class="lbl">Plaid transfer</span><span class="mono">{{ m.plaidTransferId || '—' }}</span></div>
              <div><span class="lbl">GL confirmation</span><span class="mono">{{ m.glConfirmationId || '—' }}</span></div>
              <div><span class="lbl">Settled at</span><span>{{ m.settledAt ? (m.settledAt | date:'medium') : '—' }}</span></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">
            <div class="title">Event timeline</div>
            <div class="desc">Every state change is journaled — audit trail for SOX/SOC2</div>
          </div>
          <div class="card-bd">
            <div class="tl">
              <div class="tl-item" *ngFor="let e of events">
                <div class="tl-dot"></div>
                <div class="tl-body">
                  <div class="tl-kind"><span class="material-symbols-rounded">{{ iconFor(e.kind) }}</span> {{ e.kind }}</div>
                  <div class="tl-at">{{ e.at | date:'medium' }}</div>
                </div>
              </div>
              <div *ngIf="!events.length" class="muted" style="padding:16px;">No events yet.</div>
            </div>
          </div>
        </div>
      </div>

      <aside>
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-hd"><div class="title">Actions</div></div>
          <div class="card-bd" style="display:flex; flex-direction:column; gap:8px;">
            <button mat-stroked-button (click)="simulate('pending')" [disabled]="!canSim('pending')">
              <mat-icon>schedule</mat-icon> Mark pending
            </button>
            <button mat-stroked-button (click)="simulate('posted')" [disabled]="!canSim('posted')">
              <mat-icon>pending_actions</mat-icon> Mark posted
            </button>
            <button mat-flat-button color="primary" (click)="simulate('settled')" [disabled]="!canSim('settled')">
              <mat-icon>verified</mat-icon> Settle & post to GL
            </button>
            <button mat-stroked-button color="warn" (click)="simulate('returned')" [disabled]="!canSim('returned')">
              <mat-icon>undo</mat-icon> Simulate return
            </button>
            <div class="muted" style="font-size:12px; margin-top:8px;">
              Dev helpers for sandbox. In production these are driven by Plaid webhooks.
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-hd"><div class="title">Lifecycle</div></div>
          <div class="card-bd">
            <ol class="lifecycle">
              <li [class.done]="stepDone('DRAFT')"><span class="dot"></span>Draft</li>
              <li [class.done]="stepDone('AUTHORIZED')"><span class="dot"></span>Authorized · Plaid</li>
              <li [class.done]="stepDone('SUBMITTED')"><span class="dot"></span>Submitted · ACH</li>
              <li [class.done]="stepDone('POSTED')"><span class="dot"></span>Posted at RDFI</li>
              <li [class.done]="stepDone('SETTLED')"><span class="dot"></span>Settled</li>
              <li [class.done]="stepDone('GL_POSTED')"><span class="dot"></span>GL posted · Investran</li>
            </ol>
          </div>
        </div>
      </aside>
    </div>
  </div>
  `,
  styles: [`
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; }
    .detail-grid > div { display:flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--border); }
    .detail-grid .lbl { color: var(--muted); font-size: 12px; }
    .tl { position: relative; }
    .tl:before { content:''; position: absolute; left: 8px; top: 8px; bottom: 8px; width: 1px; background: var(--border); }
    .tl-item { display: grid; grid-template-columns: 20px 1fr; padding: 8px 0; }
    .tl-dot { width: 10px; height: 10px; border-radius: 999px; background: #fff; border: 2px solid var(--brand); margin-top: 4px; z-index: 1; }
    .tl-kind { font-weight: 500; font-size: 13px; display:flex; align-items:center; gap:8px; }
    .tl-kind .material-symbols-rounded { font-size: 18px; color: var(--brand); }
    .tl-at { font-size: 12px; color: var(--muted); }
    .lifecycle { list-style: none; padding: 0; margin: 0; }
    .lifecycle li { display: flex; align-items: center; gap: 10px; padding: 6px 0; color: var(--muted); font-size: 13px; }
    .lifecycle .dot { width: 9px; height: 9px; border-radius: 999px; background: #dde2ed; }
    .lifecycle li.done { color: var(--text); }
    .lifecycle li.done .dot { background: var(--success); }
  `],
})
export class MovementDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  m?: CashMovement;
  events: any[] = [];

  label(t: string) { return (MOVEMENT_LABEL as any)[t] || t; }

  ngOnInit() {
    this.route.paramMap.subscribe((p) => { const id = p.get('id')!; this.reload(id); });
  }
  reload(id: string) {
    this.api.getMovement(id).subscribe((m) => { this.m = m; this.events = (m.events || []).reverse(); });
  }
  iconFor(kind: string) {
    if (kind.startsWith('plaid.')) return 'swap_horiz';
    if (kind.startsWith('gl.'))    return 'receipt_long';
    if (kind === 'authorized')     return 'task_alt';
    if (kind === 'submitted')      return 'send';
    if (kind === 'created')        return 'edit_note';
    return 'event';
  }
  stepDone(s: string) {
    const order = ['DRAFT','AUTHORIZED','SUBMITTED','PENDING','POSTED','SETTLED','GL_POSTED'];
    const at = order.indexOf(this.m?.status || '');
    const target = order.indexOf(s);
    return at >= target;
  }
  canSim(ev: string) {
    if (!this.m) return false;
    if (['RETURNED','FAILED','GL_POSTED'].includes(this.m.status) && ev !== 'returned') return false;
    return true;
  }
  simulate(event: 'pending'|'posted'|'settled'|'returned') {
    if (!this.m) return;
    this.api.simulate(this.m.id, event).subscribe({
      next: () => { this.snack.open(`Simulated: ${event}`, 'OK', { duration: 2000 }); this.reload(this.m!.id); },
      error: (e) => this.snack.open(e?.error?.error || 'failed', 'OK', { duration: 3000 }),
    });
  }
}
