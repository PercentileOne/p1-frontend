// Azure Function — POST /api/join-waitlist
// Saves waitlist signups to Cosmos DB (ExplainInterviewLogs / WaitlistSignups).

const { v4: uuidv4 } = require('uuid');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' },
    };
    return;
  }

  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const email = (req.body?.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    context.res = { status: 400, body: { error: 'Valid email required' } };
    return;
  }

  const doc = {
    id: uuidv4(),
    email,
    signedUpAt: new Date().toISOString(),
    source: req.body?.source ?? 'explain.global',
  };

  context.bindings.outputDocument = doc;

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { ok: true },
  };
};
