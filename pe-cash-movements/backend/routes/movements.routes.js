// Cash-movement lifecycle: draft → authorize → submit → (webhook) → settled → GL posted.
const express = require('express');
const { db, id } = require('../services/db');
const plaid = require('../services/plaid.service');
const gl = require('../services/gl.service');
const plaidRoutes = require('./plaid.routes');

const router = express.Router();

const VALID_TYPES = ['CAPITAL_CALL', 'DISTRIBUTION', 'INTERNAL_TRANSFER', 'EXPENSE_PAYMENT', 'PORTCO_INVESTMENT'];

// GET /api/movements?status=...&type=...
router.get('/', (req, res) => {
  const { status, type, fundId } = req.query;
  let rows = [...db.movements];
  if (status) rows = rows.filter((m) => m.status === status);
  if (type)   rows = rows.filter((m) => m.type === type);
  if (fundId) rows = rows.filter((m) => m.fromEntityId === fundId || m.toEntityId === fundId);
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const enriched = rows.map(enrich);
  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const m = db.movements.find((x) => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  const events = db.movementEvents.filter((e) => e.movementId === m.id);
  res.json({ ...enrich(m), events });
});

// POST /api/movements — create DRAFT
router.post('/', (req, res) => {
  const { type, fromEntityId, fromAccountId, toEntityId, toAccountId,
          amount, currency = 'USD', reference, memo } = req.body || {};
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${VALID_TYPES.join(', ')}` });
  if (!(amount > 0)) return res.status(400).json({ error: 'amount must be > 0' });

  const m = {
    id: id(),
    type, fromEntityId, fromAccountId, toEntityId, toAccountId,
    amount: Number(amount), currency, reference, memo,
    status: 'DRAFT',
    createdBy: req.body?.createdBy || 'demo-user',
    createdAt: new Date().toISOString(),
  };
  db.movements.push(m);
  db.movementEvents.push({ id: id(), movementId: m.id, at: m.createdAt, kind: 'created', payload: { type, amount } });
  res.status(201).json(enrich(m));
});

// POST /api/movements/:id/authorize — Plaid /transfer/authorization/create
router.post('/:id/authorize', async (req, res, next) => {
  try {
    const m = db.movements.find((x) => x.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    if (m.status !== 'DRAFT') return res.status(409).json({ error: `cannot authorize in status ${m.status}` });

    // In sandbox without Plaid creds we fabricate an authorization so the flow can be demoed.
    let authorization;
    if (!process.env.PLAID_CLIENT_ID) {
      authorization = { id: `auth-${Date.now()}`, decision: 'approved', decision_rationale: null };
    } else {
      const sourceAcct = db.bankAccounts.find((a) => a.id === m.fromAccountId);
      const item = db.plaidItems.find((p) => p.id === sourceAcct?.plaidItemId);
      const fromEntity = db.entities.find((e) => e.id === m.fromEntityId);
      if (!item || !sourceAcct?.plaidAccountId) {
        return res.status(400).json({ error: 'Source account is not Plaid-linked yet. Use Link first.' });
      }
      const data = await plaid.createAuthorization({
        accessToken: item.accessToken,
        accountId: sourceAcct.plaidAccountId,
        amount: m.amount,
        type: 'debit',
        description: m.reference,
        user: { legal_name: fromEntity?.name || 'PE Fund' },
      });
      authorization = data.authorization;
    }

    m.authorizationId = authorization.id;
    m.authorizationDecision = authorization.decision;
    m.status = authorization.decision === 'approved' ? 'AUTHORIZED' : 'AUTH_DECLINED';
    db.movementEvents.push({ id: id(), movementId: m.id, at: new Date().toISOString(), kind: 'authorized', payload: authorization });
    res.json(enrich(m));
  } catch (err) { next(err); }
});

// POST /api/movements/:id/submit — Plaid /transfer/create
router.post('/:id/submit', async (req, res, next) => {
  try {
    const m = db.movements.find((x) => x.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    if (m.status !== 'AUTHORIZED') return res.status(409).json({ error: `cannot submit in status ${m.status}` });

    let transfer;
    if (!process.env.PLAID_CLIENT_ID) {
      transfer = { id: `xfer-${Date.now()}`, status: 'pending' };
    } else {
      const sourceAcct = db.bankAccounts.find((a) => a.id === m.fromAccountId);
      const item = db.plaidItems.find((p) => p.id === sourceAcct?.plaidItemId);
      const data = await plaid.createTransfer({
        accessToken: item.accessToken,
        accountId: sourceAcct.plaidAccountId,
        authorizationId: m.authorizationId,
        description: m.reference,
      });
      transfer = data.transfer;
    }

    m.plaidTransferId = transfer.id;
    m.status = 'SUBMITTED';
    m.submittedAt = new Date().toISOString();
    db.movementEvents.push({ id: id(), movementId: m.id, at: m.submittedAt, kind: 'submitted', payload: transfer });
    res.json(enrich(m));
  } catch (err) { next(err); }
});

// POST /api/movements/:id/simulate — dev aid: drive the status machine in sandbox.
router.post('/:id/simulate', async (req, res, next) => {
  try {
    const m = db.movements.find((x) => x.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    const eventType = req.body?.eventType || 'settled';

    if (process.env.PLAID_CLIENT_ID && m.plaidTransferId?.startsWith('xfer_')) {
      try { await plaid.simulateTransfer({ transferId: m.plaidTransferId, eventType }); } catch (_) { /* ignore */ }
    }
    // Apply the event locally so demo works with or without Plaid.
    plaidRoutes._applyPlaidEvent(m, { event_type: eventType, transfer_id: m.plaidTransferId });
    res.json(enrich(m));
  } catch (err) { next(err); }
});

function enrich(m) {
  return {
    ...m,
    fromEntity: db.entities.find((e) => e.id === m.fromEntityId),
    toEntity:   db.entities.find((e) => e.id === m.toEntityId),
    fromAccount: db.bankAccounts.find((a) => a.id === m.fromAccountId),
    toAccount:   db.bankAccounts.find((a) => a.id === m.toAccountId),
  };
}

module.exports = router;
