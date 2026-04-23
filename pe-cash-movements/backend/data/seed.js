// Realistic-looking seed data so the UI is populated before any Plaid linking.
const { db, id } = require('../services/db');

function seed() {
  if (db.entities.length) return;

  const entities = [
    { name: 'Highland Growth Fund II LP',       type: 'FUND',    investranEntityId: 'FND-0201' },
    { name: 'Highland Growth Fund III LP',      type: 'FUND',    investranEntityId: 'FND-0301' },
    { name: 'Highland Capital Management LLC',  type: 'MGMT_CO', investranEntityId: 'MGT-0001' },
    { name: 'Alpine Capital Partners',          type: 'LP',      investranEntityId: 'LP-1001'  },
    { name: 'Meridian Pension Trust',           type: 'LP',      investranEntityId: 'LP-1002'  },
    { name: 'Aurora Family Office',             type: 'LP',      investranEntityId: 'LP-1003'  },
    { name: 'Pacific Endowment Fund',           type: 'LP',      investranEntityId: 'LP-1004'  },
    { name: 'Nimbus Robotics Inc.',             type: 'PORTCO',  investranEntityId: 'PC-2001'  },
    { name: 'Vector Bio Therapeutics',          type: 'PORTCO',  investranEntityId: 'PC-2002'  },
    { name: 'Orchid Analytics',                 type: 'PORTCO',  investranEntityId: 'PC-2003'  },
    { name: 'Kirkland & Ellis LLP',             type: 'VENDOR',  investranEntityId: 'VN-3001'  },
    { name: 'PwC — Audit',                      type: 'VENDOR',  investranEntityId: 'VN-3002'  },
    { name: 'SS&C Fund Services',               type: 'VENDOR',  investranEntityId: 'VN-3003'  },
  ].map((e) => ({ id: id(), ...e }));

  db.entities.push(...entities);

  // Pretend a handful of these already have bank accounts linked (via earlier Plaid Link).
  const fund2 = entities.find((e) => e.investranEntityId === 'FND-0201');
  const fund3 = entities.find((e) => e.investranEntityId === 'FND-0301');
  const alpine = entities.find((e) => e.investranEntityId === 'LP-1001');
  const meridian = entities.find((e) => e.investranEntityId === 'LP-1002');
  const nimbus = entities.find((e) => e.investranEntityId === 'PC-2001');
  const kirk = entities.find((e) => e.investranEntityId === 'VN-3001');

  db.bankAccounts.push(
    { id: id(), entityId: fund2.id,    name: 'JPMC Operating',      mask: '4421', type: 'checking', currency: 'USD', plaidAccountId: null },
    { id: id(), entityId: fund3.id,    name: 'JPMC Operating',      mask: '7788', type: 'checking', currency: 'USD', plaidAccountId: null },
    { id: id(), entityId: alpine.id,   name: 'BofA LP Funding',     mask: '1102', type: 'checking', currency: 'USD', plaidAccountId: null },
    { id: id(), entityId: meridian.id, name: 'State Street Custody',mask: '9981', type: 'checking', currency: 'USD', plaidAccountId: null },
    { id: id(), entityId: nimbus.id,   name: 'SVB Business',        mask: '2255', type: 'checking', currency: 'USD', plaidAccountId: null },
    { id: id(), entityId: kirk.id,     name: 'Citi Vendor',         mask: '3310', type: 'checking', currency: 'USD', plaidAccountId: null },
  );
}

module.exports = { seed };
