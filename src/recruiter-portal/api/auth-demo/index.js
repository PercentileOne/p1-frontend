// Azure Function — POST /api/auth-demo
// Issues a signed demo session token — no email required.

const { signSession } = require('../_shared/jwtUtils');
const { CORS_HEADERS } = require('../_shared/verifyToken');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const secret = process.env.JWT__SECRET;
  if (!secret) {
    context.res = { status: 503, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ error: 'Auth not configured' }) };
    return;
  }

  const sessionToken = signSession({ email: 'demo@explain.global', name: 'Demo User', role: 'recruiter' }, secret);

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify({ ok: true, token: sessionToken, email: 'demo@explain.global', name: 'Demo User' }),
  };
};
