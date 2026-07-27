// Azure Function — POST /api/save-lesson
// Saves a generated lesson to ExplainLearn/Lessons in Cosmos DB.

const { v4: uuidv4 } = require('uuid');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } };
    return;
  }

  const body = req.body;
  if (!body?.userId || !body?.lesson) {
    context.res = { status: 400, body: { ok: false, error: 'userId and lesson are required' } };
    return;
  }

  const doc = {
    id: uuidv4(),
    userId: body.userId,
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
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, id: doc.id, createdAt: doc.createdAt }),
  };
};
