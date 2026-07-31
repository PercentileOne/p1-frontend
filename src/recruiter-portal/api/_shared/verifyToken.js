// Shared JWT validator for all Explain Azure Functions.
// Verifies HMAC-SHA256 tokens issued by Explain.Api/TokenService.cs.
// Uses only Node built-ins — no npm dependencies.

const crypto = require('crypto');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Decodes and verifies a JWT signed with HMAC-SHA256.
 * Returns the payload object on success, null on failure.
 */
function verifyJwt(token) {
  const secret = process.env.JWT__SECRET ?? process.env.Jwt__Secret;
  if (!secret) throw new Error('JWT__SECRET not configured');

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (expected !== sigB64) return null;

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;

  return payload;
}

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns { userId, role, permissions } on success.
 * Returns null and sets context.res to 401 on failure.
 */
function requireAuth(context, req) {
  const authHeader = req.headers['authorization'] ?? req.headers['Authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    context.res = {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ ok: false, error: 'Missing Authorization header' }),
    };
    return null;
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch (err) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ ok: false, error: 'Auth configuration error' }),
    };
    return null;
  }

  if (!payload) {
    context.res = {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ ok: false, error: 'Invalid or expired token' }),
    };
    return null;
  }

  // perm claims may be a single string or array depending on claim count
  const perms = payload.perm
    ? Array.isArray(payload.perm) ? payload.perm : [payload.perm]
    : [];

  return {
    userId: payload.sub,
    email:  payload.email,
    name:   payload.name,
    role:   payload.role,
    permissions: perms,
  };
}

module.exports = { requireAuth, CORS_HEADERS };
