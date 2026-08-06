// Azure Function — POST /api/auth-verify
// Exchanges a magic link token for a 30-day session JWT.

const { verify, signSession } = require('../_shared/jwtUtils');
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

  const token = req.body?.token;
  if (!token) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ error: 'Token required' }) };
    return;
  }

  const payload = verify(token, secret);
  if (!payload || payload.type !== 'magic') {
    context.res = { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ error: 'Invalid or expired link' }) };
    return;
  }

  const name = payload.email.split('@')[0];
  const sessionToken = signSession({ email: payload.email, name, role: 'recruiter' }, secret);

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify({ ok: true, token: sessionToken, email: payload.email, name }),
  };
};
