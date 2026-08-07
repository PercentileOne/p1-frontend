// Azure Function — POST /api/auth-magic-link
// Generates a signed magic link and emails it to the recruiter.

const https = require('https');
const { signMagicLink } = require('../_shared/jwtUtils');
const { CORS_HEADERS } = require('../_shared/verifyToken');

function sendgridSend(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

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
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'francis@percentile.one';

  if (sgKey) {
    try {
      const result = await sendgridSend(sgKey, {
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
      });

      if (result.status >= 300) {
        context.log.error(`SendGrid ${result.status}:`, result.body);
      } else {
        context.log.info(`Magic link sent to ${email} via SendGrid (${result.status})`);
      }
    } catch (err) {
      context.log.error('SendGrid https error:', err.message);
    }
  } else {
    context.log.warn(`[Magic Link DEV] ${email} → ${link}`);
  }

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify({ ok: true, message: 'Magic link sent — check your email.' }),
  };
};
