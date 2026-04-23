import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(v: number | null | undefined, currency = 'USD'): string {
    if (v == null || isNaN(v as any)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: 2,
    }).format(Number(v));
  }
}
