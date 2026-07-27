// Azure Function — GET /api/get-lessons?userId=X
// Returns all lessons for a userId, newest first.

const { CosmosClient } = require('@azure/cosmos');

let _container = null;

function getContainer() {
  if (_container) return _container;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) throw new Error('COSMOS_ENDPOINT / COSMOS_KEY not configured');
  const client = new CosmosClient({ endpoint, key });
  _container = client.database('ExplainLearn').container('Lessons');
  return _container;
}

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const userId = req.query.userId;
  if (!userId) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'userId is required' }) };
    return;
  }

  try {
    const container = getContainer();
    const { resources } = await container.items.query(
      { query: 'SELECT c.id, c.userId, c.subject, c.language, c.createdAt, c.lesson.title, c.lesson.category, c.lesson.emoji, c.progress FROM c WHERE c.userId = @uid ORDER BY c.createdAt DESC OFFSET 0 LIMIT 100', parameters: [{ name: '@uid', value: userId }] },
      { partitionKey: userId }
    ).fetchAll();

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, count: resources.length, lessons: resources }),
    };
  } catch (err) {
    context.log.error('get-lessons error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
