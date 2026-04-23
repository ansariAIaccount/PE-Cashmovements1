import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
})
export class AppComponent {
  nav = [
    { group: 'Treasury', items: [
      { path: '/dashboard',  label: 'Dashboard',  icon: 'dashboard' },
      { path: '/movements',  label: 'Cash Movements', icon: 'swap_horiz' },
      { path: '/movements/new', label: 'New Movement', icon: 'add_circle', highlight: true },
    ]},
    { group: 'Accounts', items: [
      { path: '/entities',   label: 'Entities',   icon: 'groups' },
      { path: '/accounts',   label: 'Bank Accounts (Plaid)', icon: 'account_balance' },
    ]},
    { group: 'Accounting', items: [
      { path: '/gl',         label: 'GL Postings', icon: 'receipt_long' },
    ]},
  ];
}
