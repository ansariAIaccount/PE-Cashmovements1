// Plaid-related endpoints: Link token, public-token exchange, webhook receiver.
const express = require('express');
const { db, id } = require('../services/db');
const plaid = require('../services/plaid.service');
const gl = require('../services/gl.service');

const router = express.Router();

// POST /api/plaid/link-token — issue a Link token the UI plugs into Plaid Link.
router.post('/link-token', async (req, res, next) => {
  try {
    const userId = req.body?.userId || 'demo-user';
    const data = await plaid.createLinkToken({ userId });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/plaid/exchange-token — after Plaid Link success, exchange and persist.
router.post('/exchange-token', async (req, res, next) => {
  try {
    const { publicToken, entityId, metadata } = req.body || {};
    const exch = await plaid.exchangePublicToken(publicToken);
    const item = {
      id: id(),
      plaidItemId: exch.item_id,
      accessToken: exch.access_token, // TODO encrypt at rest in prod
      institutionName: metadata?.institution?.name,
      entityId,
      linkedAt: new Date().toISOString(),
    };
    db.plaidItems.push(item);

    // Pull accounts and persist.
    const { accounts } = await plaid.listAccounts(exch.access_token);
    const saved = accounts.map((a) => {
      const rec = {
        id: id(),
        entityId,
        plaidItemId: item.id,
        plaidAccountId: a.account_id,
        name: a.name,
        mask: a.mask,
        type: a.subtype || a.type,
        currency: a.balances?.iso_currency_code || 'USD',
      };
      db.bankAccounts.push(rec);
      return rec;
    });

    res.json({ item: { id: item.id, institutionName: item.institutionName }, accounts: saved });
  } catch (err) { next(err); }
});

// POST /api/plaid/webhook — receives TRANSFER_EVENTS_UPDATE from Plaid.
// In sandbox we also accept manual pokes from the UI via movements routes.
router.post('/webhook', async (req, res, next) => {
  try {
    const wh = req.body || {};
    console.log('[plaid webhook]', wh.webhook_type, wh.webhook_code);

    if (wh.webhook_type === 'TRANSFER' && wh.webhook_code === 'TRANSFER_EVENTS_UPDATE') {
      // Pull new events and update movement status / post GL as needed.
      const events = await plaid.syncTransferEvents({ afterId: 0, count: 25 });
      for (const ev of events.transfer_events || []) {
        const m = db.movements.find((x) => x.plaidTransferId === ev.transfer_id);
        if (!m) continue;
        applyPlaidEvent(m, ev);
      }
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

function applyPlaidEvent(m, ev) {
  db.movementEvents.push({ id: id(), movementId: m.id, at: new Date().toISOString(), kind: `plaid.${ev.event_type}`, payload: ev });
  switch (ev.event_type) {
    case 'pending':  m.status = 'PENDING'; break;
    case 'posted':   m.status = 'POSTED'; break;
    case 'settled':
      m.status = 'SETTLED';
      m.settledAt = new Date().toISOString();
      try {
        const je = gl.postMovement(m);
        m.status = 'GL_POSTED';
        m.glConfirmationId = je.confirmationId;
        db.movementEvents.push({ id: id(), movementId: m.id, at: new Date().toISOString(), kind: 'gl.posted', payload: { confirmationId: je.confirmationId } });
      } catch (e) {
        db.movementEvents.push({ id: id(), movementId: m.id, at: new Date().toISOString(), kind: 'gl.error', payload: { error: e.message } });
      }
      break;
    case 'returned': m.status = 'RETURNED'; break;
    case 'failed':   m.status = 'FAILED'; break;
    default: break;
  }
}

router._applyPlaidEvent = applyPlaidEvent; // exported for other routes to reuse

module.exports = router;
