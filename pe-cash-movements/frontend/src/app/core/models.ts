export type MovementType =
  | 'CAPITAL_CALL'
  | 'DISTRIBUTION'
  | 'INTERNAL_TRANSFER'
  | 'EXPENSE_PAYMENT'
  | 'PORTCO_INVESTMENT';

export type MovementStatus =
  | 'DRAFT'
  | 'AUTHORIZED'
  | 'AUTH_DECLINED'
  | 'SUBMITTED'
  | 'PENDING'
  | 'POSTED'
  | 'SETTLED'
  | 'GL_POSTED'
  | 'RETURNED'
  | 'FAILED';

export interface Entity {
  id: string;
  name: string;
  type: 'FUND' | 'LP' | 'PORTCO' | 'VENDOR' | 'MGMT_CO';
  investranEntityId: string;
}

export interface BankAccount {
  id: string;
  entityId: string;
  name: string;
  mask: string;
  type: string;
  currency: string;
  plaidAccountId?: string | null;
  plaidItemId?: string | null;
  entity?: Entity;
}

export interface CashMovement {
  id: string;
  type: MovementType;
  fromEntityId: string;
  fromAccountId: string;
  toEntityId: string;
  toAccountId?: string;
  amount: number;
  currency: string;
  reference: string;
  memo?: string;
  status: MovementStatus;
  createdAt: string;
  settledAt?: string;
  authorizationId?: string;
  plaidTransferId?: string;
  glConfirmationId?: string;
  fromEntity?: Entity;
  toEntity?: Entity;
  fromAccount?: BankAccount;
  toAccount?: BankAccount;
}

export interface JournalEntryLine {
  entityId: string;
  entityName: string;
  account: string;
  debit: number;
  credit: number;
  description: string;
}
export interface JournalEntry {
  id: string;
  movementId: string;
  postedAt: string;
  confirmationId: string;
  status: string;
  reference: string;
  currency: string;
  lines: JournalEntryLine[];
  totals: { debit: number; credit: number };
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  CAPITAL_CALL:      'Capital Call',
  DISTRIBUTION:      'Distribution',
  INTERNAL_TRANSFER: 'Internal Transfer',
  EXPENSE_PAYMENT:   'Expense Payment',
  PORTCO_INVESTMENT: 'PortCo Investment',
};
