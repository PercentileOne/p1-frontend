// Azure Function — PATCH /api/update-lesson-progress
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

  const { id, progress } = req.body ?? {};
  if (!id || !progress) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: 'id and progress are required' }) };
    return;
  }

  try {
    const { resource: existing } = await getContainer().item(id, caller.userId).read();
    if (!existing) {
      context.res = { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: 'Lesson not found' }) };
      return;
    }

    const updated = { ...existing, progress: { ...existing.progress, ...progress } };
    await getContainer().item(id, caller.userId).replace(updated);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    context.log.error('update-lesson-progress error:', err.message);
    context.res = { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
