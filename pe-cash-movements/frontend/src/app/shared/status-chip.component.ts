import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const ICONS: Record<string, string> = {
  DRAFT: 'edit_note',
  AUTHORIZED: 'task_alt',
  AUTH_DECLINED: 'block',
  SUBMITTED: 'send',
  PENDING: 'schedule',
  POSTED: 'pending_actions',
  SETTLED: 'verified',
  GL_POSTED: 'check_circle',
  RETURNED: 'undo',
  FAILED: 'error',
};

@Component({
  selector: 'status-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-chip s-{{status}}">
      <span class="material-symbols-rounded">{{ icon }}</span>
      {{ label }}
    </span>
  `,
})
export class StatusChipComponent {
  @Input() status: string = 'DRAFT';
  get label(): string { return (this.status || '').replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
  get icon(): string { return ICONS[this.status] || 'radio_button_unchecked'; }
}
