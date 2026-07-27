// Azure Function — GET /api/get-lesson?id=X&userId=X
// Returns a single full lesson by id.

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

  const { id, userId } = req.query;
  if (!id || !userId) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'id and userId are required' }) };
    return;
  }

  try {
    const container = getContainer();
    const { resource } = await container.item(id, userId).read();

    if (!resource) {
      context.res = { status: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Lesson not found' }) };
      return;
    }

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, lesson: resource }),
    };
  } catch (err) {
    context.log.error('get-lesson error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
