# PE Cash Movements — Plaid × Investran GL

A treasury / cash‑movement workstation for Private Capital Suite (Investran) funds,
replacing the classic FIS Integrity (PCS‑TRM) integration with a modern **Plaid**
money‑movement pipeline.

> Scope: working prototype. Angular Material UI + Node/Express backend wired to the
> Plaid **sandbox** environment. Investran GL posting is a local, realistic mock so
> the full initiate → authorize → settle → post‑to‑GL flow can be demonstrated end‑to‑end.

---

## What it does

1. **Link bank accounts** for fund, LP, portfolio‑company, and vendor entities via Plaid Link.
2. **Initiate cash movements** of five types:
   - Capital calls (LP → Fund)
   - Distributions (Fund → LP)
   - Fund‑to‑fund / internal transfers
   - Expense / vendor payments
   - Portfolio company investments
3. **Authorize + execute** transfers through Plaid Transfer (ACH) in sandbox.
4. **Track status** via Plaid webhooks (pending → posted → settled / returned).
5. **Post double‑entry journal entries** to the (mocked) Investran GL on settlement,
   returning a confirmation ID and full JE audit trail.

```
 ┌──────────────┐  link/transfer   ┌─────────┐     ACH (sandbox)    ┌────────┐
 │  Angular UI  │ ───────────────▶ │ Backend │ ───────────────────▶ │ Plaid  │
 │  (Material)  │ ◀─── status ──── │ (Node)  │ ◀── webhook ──────── │        │
 └──────┬───────┘                  └────┬────┘                      └────────┘
        │                               │ on settled
        │ view JEs                      ▼
        │                          ┌──────────┐
        └─────────────────────────▶│ Investran│   (mocked GL service —
                                   │   GL     │    swap for real REST
                                   │  (mock)  │    client when ready)
                                   └──────────┘
```

---

## Repository layout

```
pe-cash-movements/
├── README.md                 ← this file
├── ARCHITECTURE.md           ← data model, API surface, GL mapping
├── ui-preview.html           ← single‑file clickable UI preview
├── backend/                  ← Node/Express + Plaid sandbox + mocked GL
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── data/
│   │   └── seed.js           ← sample funds, LPs, PortCos, vendors
│   ├── services/
│   │   ├── db.js             ← in‑memory store (swap for Postgres later)
│   │   ├── plaid.service.js  ← Plaid SDK wrapper (Link, Transfer)
│   │   └── gl.service.js     ← Investran GL mock (double‑entry posting)
│   └── routes/
│       ├── plaid.routes.js
│       ├── movements.routes.js
│       ├── entities.routes.js
│       ├── accounts.routes.js
│       └── gl.routes.js
└── frontend/                 ← Angular 17 + Material
    ├── package.json
    ├── angular.json
    ├── tsconfig.json
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.scss
        └── app/
            ├── app.module.ts
            ├── app.component.{ts,html,scss}
            ├── app-routing.module.ts
            ├── core/
            │   └── services/ (api.service.ts, plaid-link.service.ts)
            └── features/
                ├── dashboard/
                ├── movements/         ← list + New Movement stepper
                ├── entities/          ← funds, LPs, PortCos, vendors
                ├── accounts/          ← Plaid‑linked bank accounts
                └── gl/                ← posted journal entries
```

---

## Quick start

### 1. Get Plaid sandbox keys (free)

1. Sign up at <https://dashboard.plaid.com/signup>.
2. Create sandbox credentials: **client_id** and **sandbox secret**.
3. Enable the **Transfer** product for sandbox.

### 2. Run the backend

```bash
cd backend
cp .env.example .env
#   → paste PLAID_CLIENT_ID and PLAID_SECRET into .env
npm install
npm run dev
# → http://localhost:4000
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm start
# → http://localhost:4200
```

The frontend proxies `/api/*` to `http://localhost:4000` (see `proxy.conf.json`).

### 4. Quick UI preview (no install)

Double‑click `ui-preview.html`. This is a static, single‑file mock of the crisp
enterprise UI so you can see the design immediately while the Angular app is
building.

---

## Demo script (end‑to‑end)

1. **Entities** → pick "Fund II LP" and an LP, say *Alpine Capital*.
2. **Bank Accounts** → click **Link with Plaid**, use Plaid's sandbox credentials
   (`user_good` / `pass_good`) to connect a checking account to each entity.
3. **New Movement** → stepper:
   - Step 1 — Type: *Capital Call*
   - Step 2 — From: Alpine Capital (LP); To: Fund II LP operating acct
   - Step 3 — Amount: $2,500,000; Reference: Call #7
   - Step 4 — Review → **Authorize & Submit**
4. The backend calls `POST /transfer/authorization/create` then
   `/transfer/create` against Plaid sandbox.
5. Trigger settlement via the **Simulate Settlement** dev button (calls Plaid's
   sandbox `/sandbox/transfer/simulate`). Webhook fires → backend posts JE
   to the mocked Investran GL.
6. **GL Postings** tab → confirmation ID, debits/credits, audit trail.

---

## From Integrity to Plaid — mapping notes

The `PCS‑TRM Standard Integration Definition Appendix` describes how FIS Integrity
previously fed settled movements back into Investran via file‑based JE imports.
This build preserves the **data contract** (one JE per settled movement, with
entity, account, amount, and reference fields) but replaces the transport:

| Integrity concept                 | Plaid equivalent here                  |
| --------------------------------- | -------------------------------------- |
| Counterparty bank account file    | Plaid Item + Account (linked via Link) |
| Wire/ACH instruction file         | Plaid Transfer authorization + create  |
| Status polling / file drop        | Plaid webhooks (`TRANSFER_EVENTS_UPDATE`) |
| JE import file (CSV/XML)          | `gl.service.js` mocked posting call    |

When the real Investran GL endpoint is available, replace `gl.service.js` with
the REST client — the interface (`postMovement(movement): { confirmationId, journalLines[] }`)
stays the same.

---

## Security & compliance notes for production (not in scope here)

- Store Plaid `access_token`s encrypted at rest (KMS‑wrapped).
- Enforce **maker/checker** on authorize step — current prototype has a single
  reviewer; production will need role‑based approvals.
- All Plaid webhooks must be **signature‑verified** (`Plaid-Verification` JWT).
- SOC 2 / SOX controls: every state change is journaled in `movement_events`
  (already in the mock) for audit.
