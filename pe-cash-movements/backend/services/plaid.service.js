// Thin wrapper around the Plaid SDK (sandbox by default).
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');

function client() {
  const env = process.env.PLAID_ENV || 'sandbox';
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    console.warn('[plaid] PLAID_CLIENT_ID / PLAID_SECRET not set — link/transfer calls will fail.');
  }
  const config = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
        'Plaid-Version': '2020-09-14',
      },
    },
  });
  return new PlaidApi(config);
}

const plaid = client();

// --- Link --------------------------------------------------------------------

async function createLinkToken({ userId, webhook }) {
  const products = (process.env.PLAID_PRODUCTS || 'auth,transfer')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const resp = await plaid.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'PE Cash Movements',
    products,
    country_codes: (process.env.PLAID_COUNTRY_CODES || 'US').split(',').map((c) => c.trim()),
    language: 'en',
    webhook: webhook || process.env.PLAID_WEBHOOK_URL,
  });
  return resp.data;
}

async function exchangePublicToken(publicToken) {
  const resp = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  return resp.data; // { access_token, item_id, request_id }
}

async function listAccounts(accessToken) {
  const resp = await plaid.accountsGet({ access_token: accessToken });
  return resp.data;
}

// --- Transfer ----------------------------------------------------------------

async function createAuthorization({ accessToken, accountId, amount, type, user, description }) {
  // type = 'debit' (pulling funds in — capital calls, LP funding) or 'credit' (paying out)
  const resp = await plaid.transferAuthorizationCreate({
    access_token: accessToken,
    account_id: accountId,
    type,
    network: 'ach',
    amount: amount.toFixed(2),
    ach_class: 'ccd',
    user,
    iso_currency_code: 'USD',
    description: (description || 'PE movement').slice(0, 15),
  });
  return resp.data; // { authorization: {id, decision, ...} }
}

async function createTransfer({ accessToken, accountId, authorizationId, description }) {
  const resp = await plaid.transferCreate({
    access_token: accessToken,
    account_id: accountId,
    authorization_id: authorizationId,
    description: (description || 'PE movement').slice(0, 15),
  });
  return resp.data; // { transfer: {id, status, ...} }
}

async function simulateTransfer({ transferId, eventType = 'posted' }) {
  const resp = await plaid.sandboxTransferSimulate({
    transfer_id: transferId,
    event_type: eventType, // 'posted' | 'settled' | 'returned'
  });
  return resp.data;
}

async function syncTransferEvents({ afterId = 0, count = 25 } = {}) {
  const resp = await plaid.transferEventSync({ after_id: afterId, count });
  return resp.data; // { transfer_events: [...] }
}

module.exports = {
  createLinkToken,
  exchangePublicToken,
  listAccounts,
  createAuthorization,
  createTransfer,
  simulateTransfer,
  syncTransferEvents,
};
