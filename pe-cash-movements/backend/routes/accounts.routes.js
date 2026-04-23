const express = require('express');
const { db } = require('../services/db');

const router = express.Router();

// GET /api/accounts?entityId=...
router.get('/', (req, res) => {
  const { entityId } = req.query;
  const rows = entityId
    ? db.bankAccounts.filter((a) => a.entityId === entityId)
    : db.bankAccounts;
  const enriched = rows.map((a) => ({
    ...a,
    entity: db.entities.find((e) => e.id === a.entityId),
  }));
  res.json(enriched);
});

module.exports = router;
