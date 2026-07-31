// Azure Function — GET /api/get-lessons
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

  try {
    const { resources } = await getContainer().items.query(
      { query: 'SELECT c.id, c.userId, c.subject, c.language, c.createdAt, c.lesson.title, c.lesson.category, c.lesson.emoji, c.progress FROM c WHERE c.userId = @uid ORDER BY c.createdAt DESC OFFSET 0 LIMIT 100', parameters: [{ name: '@uid', value: caller.userId }] },
      { partitionKey: caller.userId }
    ).fetchAll();

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, count: resources.length, lessons: resources }),
    };
  } catch (err) {
    context.log.error('get-lessons error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
