# Architecture

## Data model (simplified)

```
Entity              { id, name, type: 'FUND'|'LP'|'PORTCO'|'VENDOR'|'MGMT_CO', investranEntityId }
BankAccount         { id, entityId, plaidItemId, plaidAccountId, mask, name, type, currency }
CashMovement        { id, type, fromEntityId, fromAccountId, toEntityId, toAccountId,
                      amount, currency, reference, memo, status, plaidTransferId,
                      authorizationId, createdBy, createdAt, settledAt }
MovementEvent       { id, movementId, at, kind, payload }   ← audit journal
JournalEntry        { id, movementId, postedAt, confirmationId, lines: [ {account, dr, cr, entity} ] }
```

## Movement lifecycle

```
 DRAFT ─▶ AUTHORIZED ─▶ SUBMITTED ─▶ PENDING ─▶ POSTED ─▶ SETTLED ─▶ GL_POSTED
                                       │
                                       └─▶ RETURNED ─▶ GL_REVERSED
```

Every transition appends a row to `MovementEvent`.

## GL mapping

Double‑entry rules applied by `gl.service.js`:

| Movement type            | Debit                          | Credit                          |
| ------------------------ | ------------------------------ | ------------------------------- |
| Capital call             | Fund Operating Cash            | LP Capital Contributions Receiv.|
| Distribution             | LP Distributions Payable       | Fund Operating Cash             |
| Fund‑to‑fund transfer    | Receiving Fund Cash            | Sending Fund Cash               |
| Expense / vendor payment | Expense Account (by category)  | Fund Operating Cash             |
| PortCo investment        | Investments — Portfolio        | Fund Operating Cash             |

Each journal line is tagged with `entity`, `fundId`, `ledgerAccount`, and the
source `movementId` — the same shape Investran expects today from Integrity.

## API surface

```
POST   /api/plaid/link-token                 → Plaid Link token for UI
POST   /api/plaid/exchange-token             → exchange public_token → access_token
GET    /api/entities                         → list funds/LPs/etc.
GET    /api/accounts?entityId=               → linked bank accounts
POST   /api/accounts                         → persist linked account
GET    /api/movements                        → list with filters
POST   /api/movements                        → create DRAFT
POST   /api/movements/:id/authorize          → Plaid /transfer/authorization/create
POST   /api/movements/:id/submit             → Plaid /transfer/create
POST   /api/movements/:id/simulate-settle    → DEV: sandbox simulate
POST   /api/plaid/webhook                    → Plaid webhook receiver
GET    /api/gl/postings                      → list JE postings
```
