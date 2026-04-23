const express = require('express');
const { db, id } = require('../services/db');

const router = express.Router();

// GET /api/entities?type=FUND
router.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type ? db.entities.filter((e) => e.type === type) : db.entities;
  res.json(rows);
});

router.post('/', (req, res) => {
  const e = { id: id(), ...req.body };
  db.entities.push(e);
  res.status(201).json(e);
});

module.exports = router;
