// In-memory data store. Swap for Postgres / Prisma in production.
const { v4: uuid } = require('uuid');

const db = {
  entities: [],       // funds, LPs, PortCos, vendors, mgmt co
  bankAccounts: [],   // Plaid-linked accounts per entity
  movements: [],      // cash movements through their lifecycle
  movementEvents: [], // append-only audit journal
  journalEntries: [], // posted JEs (mocked Investran GL)
  plaidItems: [],     // Plaid items (access_token + institution)
};

const id = () => uuid();

module.exports = { db, id };
