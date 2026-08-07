// Azure Function — POST /api/auth-magic-link
// Generates a signed magic link and emails it to the recruiter.

const { signMagicLink } = require('../_shared/jwtUtils');
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

  const email = req.body?.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    context.res = { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, body: JSON.stringify({ error: 'Valid email required' }) };
    return;
  }

  const token = signMagicLink(email, secret);
  const portalUrl = process.env.RECRUITER_PORTAL_URL || 'https://recruiter.explain.global';
  const link = `${portalUrl}/auth/verify?token=${token}`;

  const sgKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'hello@explain.global';

  if (sgKey) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sgKey}` },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromEmail, name: 'Explain' },
          subject: 'Your Explain sign-in link',
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#080812;color:#fff;border-radius:16px;">
                <div style="font-size:22px;font-weight:800;margin-bottom:8px;">explain<span style="color:#4F8EF7">.global</span></div>
                <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:32px;">Recruiter Portal</div>
                <p style="font-size:16px;line-height:1.6;color:rgba(255,255,255,0.85);">Click the button below to sign in. This link expires in <strong>15 minutes</strong> and can only be used once.</p>
                <a href="${link}" style="display:inline-block;margin:24px 0;padding:16px 32px;background:linear-gradient(135deg,#4F8EF7,#a78bfa);color:#fff;text-decoration:none;border-radius:12px;font-weight:800;font-size:15px;">Sign in to Explain →</a>
                <p style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:24px;">If you didn't request this, you can safely ignore this email. This link was requested for ${email}.</p>
              </div>
            `,
          }],
        }),
      });
      if (!sgRes.ok) {
        const errBody = await sgRes.text();
        context.log.error(`SendGrid ${sgRes.status}:`, errBody);
      }
    } catch (err) {
      context.log.error('SendGrid error:', err.message);
    }
  } else {
    // Dev fallback — log to function console
    context.log.warn(`[Magic Link DEV] ${email} → ${link}`);
  }

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify({ ok: true, message: 'Magic link sent — check your email.' }),
  };
};
