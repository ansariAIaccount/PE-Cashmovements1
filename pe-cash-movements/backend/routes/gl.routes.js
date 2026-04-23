const express = require('express');
const { db } = require('../services/db');

const router = express.Router();

router.get('/postings', (_req, res) => {
  const rows = [...db.journalEntries].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  res.json(rows);
});

router.get('/postings/:id', (req, res) => {
  const je = db.journalEntries.find((x) => x.id === req.params.id);
  if (!je) return res.status(404).json({ error: 'Not found' });
  res.json(je);
});

module.exports = router;
