// Azure Function — POST /api/save-lesson
const { v4: uuidv4 } = require('uuid');
const { requireAuth, CORS_HEADERS } = require('../_shared/verifyToken');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const caller = requireAuth(context, req);
  if (!caller) return;

  const body = req.body;
  if (!body?.lesson) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ ok: false, error: 'lesson is required' }) };
    return;
  }

  const doc = {
    id: uuidv4(),
    userId: caller.userId,
    subject: body.lesson.subject ?? body.lesson.title ?? 'Unknown',
    language: body.language ?? 'English',
    createdAt: new Date().toISOString(),
    lesson: body.lesson,
    progress: {
      conceptsUnderstood: (body.lesson.keyConcepts ?? []).map(() => false),
      misconceptionsUnderstood: (body.lesson.misconceptions ?? []).map(() => false),
    },
  };

  context.bindings.outputDocument = doc;

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify({ ok: true, id: doc.id, createdAt: doc.createdAt }),
  };
};
