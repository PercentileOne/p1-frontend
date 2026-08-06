// Shared JWT utilities for Explain Azure Functions.
const crypto = require('crypto');

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

function sign(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = base64url(JSON.stringify(payload));
  const sig    = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verify(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (expected !== sig) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

function signMagicLink(email, secret) {
  return sign({ type: 'magic', email, exp: Math.floor(Date.now() / 1000) + 900 }, secret); // 15 min
}

function signSession(user, secret) {
  return sign({
    sub:  user.email,
    email: user.email,
    name:  user.name,
    role:  user.role ?? 'recruiter',
    exp:   Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30 days
  }, secret);
}

module.exports = { sign, verify, signMagicLink, signSession };
