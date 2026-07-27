// Azure Function — POST /api/log-event
// Writes interview flow events to Cosmos DB (ExplainInterviewLogs / FlowLogs).
// Connection string stored in Azure Application Settings — never in browser.

const { v4: uuidv4 } = require('uuid');

module.exports = async function (context, req) {
  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method not allowed' };
    return;
  }

  const body = req.body;
  if (!body || !body.sessionId || !body.flowStage) {
    context.res = { status: 400, body: 'Missing required fields: sessionId, flowStage' };
    return;
  }

  const doc = {
    id: uuidv4(),
    sessionId: body.sessionId,
    timestamp: body.timestamp ?? new Date().toISOString(),
    flowStage: body.flowStage,
    payload: body.payload ?? {},
  };

  // Output binding writes to Cosmos DB
  context.bindings.outputDocument = doc;

  context.res = { status: 200, body: { ok: true, id: doc.id } };
};
