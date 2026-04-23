import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { Entity } from '../../core/models';

const TYPE_LABEL: Record<Entity['type'], string> = {
  FUND: 'Fund', LP: 'Limited Partner', PORTCO: 'Portfolio Company', VENDOR: 'Vendor', MGMT_CO: 'Management Co',
};

@Component({
  selector: 'app-entities',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Entities</h1>
        <div class="sub">Funds, LPs, portfolio companies, vendors — all sources/destinations for cash movements</div>
      </div>
      <button mat-stroked-button>
        <mat-icon>upload</mat-icon> Sync from Investran
      </button>
    </div>

    <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px;">
      <div class="pill-tab" [class.active]="!filter" (click)="filter=null">All ({{ all.length }})</div>
      <div class="pill-tab" *ngFor="let t of types"
           [class.active]="filter === t"
           (click)="filter = t">{{ labelType(t) }} ({{ count(t) }})</div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="enterprise">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Investran ID</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let e of visible()">
              <td style="font-weight:500;">{{ e.name }}</td>
              <td>{{ labelType(e.type) }}</td>
              <td class="mono">{{ e.investranEntityId }}</td>
              <td><button mat-icon-button><mat-icon>chevron_right</mat-icon></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `,
})
export class EntitiesComponent implements OnInit {
  private api = inject(ApiService);
  all: Entity[] = [];
  filter: Entity['type'] | null = null;
  types: Entity['type'][] = ['FUND','LP','PORTCO','VENDOR','MGMT_CO'];
  labelType(t: Entity['type']) { return TYPE_LABEL[t]; }
  ngOnInit() { this.api.listEntities().subscribe((r) => this.all = r); }
  count(t: Entity['type']) { return this.all.filter((e) => e.type === t).length; }
  visible() { return this.filter ? this.all.filter((e) => e.type === this.filter) : this.all; }
}
