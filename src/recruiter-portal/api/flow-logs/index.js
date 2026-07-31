// Azure Function — GET /api/flow-logs
// Requires CAN_VIEW_ANALYTICS permission (Recruiter/Admin/SuperAdmin only).
const { CosmosClient } = require('@azure/cosmos');
const { requireAuth, CORS_HEADERS } = require('../_shared/verifyToken');

let _container = null;

function getContainer() {
  if (_container) return _container;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY not configured');
  _container = new CosmosClient({ endpoint, key }).database('ExplainInterviewLogs').container('FlowLogs');
  return _container;
}

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const caller = requireAuth(context, req);
  if (!caller) return;

  if (!caller.permissions.includes('CAN_VIEW_ANALYTICS')) {
    context.res = {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ ok: false, error: 'Forbidden: CAN_VIEW_ANALYTICS required' }),
    };
    return;
  }

  const limit = Math.min(parseInt(req.query.limit ?? '500', 10) || 500, 2000);
  const sessionFilter = req.query.session ?? null;

  try {
    const sql = sessionFilter
      ? `SELECT * FROM c WHERE c.sessionId = @sid ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${limit}`
      : `SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${limit}`;

    const params = sessionFilter ? [{ name: '@sid', value: sessionFilter }] : [];
    const { resources } = await getContainer().items.query({ query: sql, parameters: params }, { maxItemCount: limit }).fetchAll();

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, count: resources.length, events: resources }),
    };
  } catch (err) {
    context.log.error('flow-logs error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
