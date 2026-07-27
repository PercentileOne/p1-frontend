// Azure Function — GET /api/flow-logs
// Returns all FlowLogs from Cosmos DB, newest sessions first.
// Query params:
//   ?limit=N   — max events to return (default 500)
//   ?session=X — filter to a single sessionId

const { CosmosClient } = require('@azure/cosmos');

let _container = null;

function getContainer() {
  if (_container) return _container;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY not configured');
  const client = new CosmosClient({ endpoint, key });
  _container = client.database('ExplainInterviewLogs').container('FlowLogs');
  return _container;
}

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const limit = Math.min(parseInt(req.query.limit ?? '500', 10) || 500, 2000);
  const sessionFilter = req.query.session ?? null;

  try {
    const container = getContainer();

    const sql = sessionFilter
      ? `SELECT * FROM c WHERE c.sessionId = @sid ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${limit}`
      : `SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${limit}`;

    const params = sessionFilter ? [{ name: '@sid', value: sessionFilter }] : [];

    const { resources } = await container.items.query({ query: sql, parameters: params }, { maxItemCount: limit }).fetchAll();

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ ok: true, count: resources.length, events: resources }),
    };
  } catch (err) {
    context.log.error('flow-logs error:', err.message);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
