// Mocked Investran GL posting service.
// Real world: swap this for a REST/SOAP client to Investran's GL endpoint.
// The `postMovement` contract stays the same.

const { db, id } = require('./db');

// Minimal chart of accounts keyed by purpose.
const COA = {
  FUND_OPERATING_CASH:           '1010',
  LP_CAPITAL_CONTRIB_RECEIVABLE: '1300',
  LP_DISTRIBUTIONS_PAYABLE:      '2200',
  INVESTMENTS_PORTFOLIO:         '1500',
  INTERCO_DUE_FROM:              '1400',
  INTERCO_DUE_TO:                '2400',
  EXPENSE_LEGAL:                 '6010',
  EXPENSE_AUDIT:                 '6020',
  EXPENSE_FUND_ADMIN:            '6030',
  EXPENSE_OTHER:                 '6090',
};

function expenseAccountFor(vendorName = '') {
  const n = vendorName.toLowerCase();
  if (n.includes('kirk') || n.includes('ellis') || n.includes('law')) return COA.EXPENSE_LEGAL;
  if (n.includes('pwc') || n.includes('audit') || n.includes('kpmg') || n.includes('ey')) return COA.EXPENSE_AUDIT;
  if (n.includes('ss&c') || n.includes('admin')) return COA.EXPENSE_FUND_ADMIN;
  return COA.EXPENSE_OTHER;
}

// Build double-entry lines from a settled movement.
function buildJournal(movement, ctx) {
  const { fromEntity, toEntity } = ctx;
  const amount = Number(movement.amount);
  const base = {
    movementId: movement.id,
    reference:  movement.reference,
    memo:       movement.memo,
    amount,
    currency:   movement.currency || 'USD',
  };

  switch (movement.type) {
    case 'CAPITAL_CALL':
      return [
        { account: COA.FUND_OPERATING_CASH,           entity: toEntity,   dr: amount, cr: 0,       desc: `Capital call ${movement.reference}` },
        { account: COA.LP_CAPITAL_CONTRIB_RECEIVABLE, entity: fromEntity, dr: 0,       cr: amount, desc: `LP contribution ${fromEntity.name}` },
      ].map((l) => ({ ...base, ...l }));

    case 'DISTRIBUTION':
      return [
        { account: COA.LP_DISTRIBUTIONS_PAYABLE, entity: toEntity,   dr: amount, cr: 0,       desc: `Distribution ${movement.reference}` },
        { account: COA.FUND_OPERATING_CASH,      entity: fromEntity, dr: 0,       cr: amount, desc: `Cash paid from ${fromEntity.name}` },
      ].map((l) => ({ ...base, ...l }));

    case 'INTERNAL_TRANSFER':
      return [
        { account: COA.FUND_OPERATING_CASH, entity: toEntity,   dr: amount, cr: 0,       desc: `Receiving fund ${toEntity.name}` },
        { account: COA.FUND_OPERATING_CASH, entity: fromEntity, dr: 0,       cr: amount, desc: `Sending fund ${fromEntity.name}` },
      ].map((l) => ({ ...base, ...l }));

    case 'EXPENSE_PAYMENT': {
      const acct = expenseAccountFor(toEntity?.name);
      return [
        { account: acct,                    entity: fromEntity, dr: amount, cr: 0,       desc: `Expense ${toEntity?.name || 'vendor'}` },
        { account: COA.FUND_OPERATING_CASH, entity: fromEntity, dr: 0,       cr: amount, desc: `Cash paid` },
      ].map((l) => ({ ...base, ...l }));
    }

    case 'PORTCO_INVESTMENT':
      return [
        { account: COA.INVESTMENTS_PORTFOLIO, entity: toEntity,   dr: amount, cr: 0,       desc: `Investment in ${toEntity.name}` },
        { account: COA.FUND_OPERATING_CASH,   entity: fromEntity, dr: 0,       cr: amount, desc: `Cash from ${fromEntity.name}` },
      ].map((l) => ({ ...base, ...l }));

    default:
      throw new Error(`Unknown movement type: ${movement.type}`);
  }
}

function postMovement(movement) {
  const fromEntity = db.entities.find((e) => e.id === movement.fromEntityId);
  const toEntity   = db.entities.find((e) => e.id === movement.toEntityId);

  const lines = buildJournal(movement, { fromEntity, toEntity });

  // Sanity check: debits == credits.
  const dr = lines.reduce((s, l) => s + l.dr, 0);
  const cr = lines.reduce((s, l) => s + l.cr, 0);
  if (Math.abs(dr - cr) > 0.001) {
    throw new Error(`JE out of balance: DR ${dr} vs CR ${cr}`);
  }

  const je = {
    id: id(),
    movementId: movement.id,
    postedAt: new Date().toISOString(),
    confirmationId: `INV-${Math.floor(Math.random() * 9e6 + 1e6)}`,
    status: 'POSTED',
    lines: lines.map((l) => ({
      entityId:   l.entity?.id,
      entityName: l.entity?.name,
      account:    l.account,
      debit:      l.dr,
      credit:     l.cr,
      description: l.desc,
    })),
    totals: { debit: dr, credit: cr },
    currency: movement.currency || 'USD',
    reference: movement.reference,
  };

  db.journalEntries.push(je);
  return je;
}

module.exports = { postMovement, COA };
