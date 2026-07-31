// Azure Function — GET /api/get-lesson?id=X
const { CosmosClient } = require('@azure/cosmos');
const { requireAuth, CORS_HEADERS } = require('../_shared/verifyToken');

let _container = null;

function getContainer() {
  if (_container) return _container;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY not configured');
  _container = new CosmosClient({ endpoint, key }).database('ExplainLearn').container('Lessons');
  return _container;
}

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const caller = requireAuth(context, req);
  if (!caller) return;

  const { id } = req.query;
  if (!id) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: 'id is required' }) };
    return;
  }

  try {
    const { resource } = await getContainer().item(id, caller.userId).read();

    if (!resource) {
      context.res = { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: 'Lesson not found' }) };
      return;
    }

    // Ownership enforced: Cosmos partition key IS userId, so a cross-user read returns null.
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, lesson: resource }),
    };
  } catch (err) {
    context.log.error('get-lesson error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
