// PE Cash Movements backend — Express app wiring Plaid sandbox + mocked Investran GL.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const plaidRoutes = require('./routes/plaid.routes');
const entityRoutes = require('./routes/entities.routes');
const accountRoutes = require('./routes/accounts.routes');
const movementRoutes = require('./routes/movements.routes');
const glRoutes = require('./routes/gl.routes');

const { seed } = require('./data/seed');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Seed demo entities / bank accounts so the UI has something to work with.
seed();

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/plaid', plaidRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/gl', glRoutes);

// Central error handler (so Plaid SDK errors become readable JSON).
app.use((err, _req, res, _next) => {
  const status = err.response?.status || 500;
  const body = err.response?.data || { error: err.message || 'Internal error' };
  console.error('[error]', status, body);
  res.status(status).json(body);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`PE Cash Movements API listening on :${port}  (Plaid env=${process.env.PLAID_ENV || 'sandbox'})`);
});
