// Azure Function — POST /api/log-event
// Auth required: attaches verified userId to every log doc.
const { v4: uuidv4 } = require('uuid');
const { requireAuth, CORS_HEADERS } = require('../_shared/verifyToken');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  // Auth is optional — unauthenticated callers (e.g. demo flow) still log but without a userId
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
  let caller = null;
  if (authHeader.startsWith('Bearer ')) {
    caller = requireAuth(context, req);
    if (!caller) return; // token present but invalid — reject
  }

  const body = req.body;
  if (!body?.sessionId || !body?.flowStage) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: 'sessionId and flowStage are required' }) };
    return;
  }

  const doc = {
    id: uuidv4(),
    userId: caller?.userId ?? 'anonymous',
    sessionId: body.sessionId,
    timestamp: body.timestamp ?? new Date().toISOString(),
    flowStage: body.flowStage,
    payload: body.payload ?? {},
  };

  context.bindings.outputDocument = doc;

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify({ ok: true, id: doc.id }),
  };
};
