// Azure Function — PATCH /api/update-lesson-progress
// Updates progress fields on a saved lesson.

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
    context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PATCH,POST', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const { id, userId, progress } = req.body ?? {};
  if (!id || !userId || !progress) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'id, userId, and progress are required' }) };
    return;
  }

  try {
    const container = getContainer();
    const { resource: existing } = await container.item(id, userId).read();
    if (!existing) {
      context.res = { status: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Lesson not found' }) };
      return;
    }

    const updated = { ...existing, progress: { ...existing.progress, ...progress } };
    await container.item(id, userId).replace(updated);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    context.log.error('update-lesson-progress error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
