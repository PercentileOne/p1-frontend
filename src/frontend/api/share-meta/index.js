// Azure Function — GET /api/share-meta/{token}, reached via a staticwebapp.config.json
// rewrite of /shared/{token}. Serves the SAME built index.html (so the real SPA still
// boots identically for humans) with just the <title>/og:*/twitter:* tags patched to
// describe this specific interview — otherwise every shared link on LinkedIn, Slack,
// WhatsApp etc. shows the same generic homepage preview, since those crawlers never
// run JavaScript and only ever see whatever static HTML index.html always contains.
const EXPLAIN_API_URL = process.env.EXPLAIN_API_URL || 'https://explain-api.azurewebsites.net';
const FALLBACK_IMAGE = 'https://product.interviewme.global/im-social-card.png';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceMetaContent(html, selectorRegex, content) {
  return html.replace(selectorRegex, (tag) => tag.replace(/content="[^"]*"/, `content="${content}"`));
}

module.exports = async function (context, req) {
  const token = context.bindingData.token;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `https://${host}`;

  let html;
  try {
    const shellRes = await fetch(`${origin}/index.html`);
    html = await shellRes.text();
  } catch (err) {
    context.log.error('share-meta: failed to fetch index.html shell', err);
    context.res = { status: 502, body: 'Failed to load app shell' };
    return;
  }

  try {
    const dataRes = await fetch(`${EXPLAIN_API_URL}/api/interviews/shared/${encodeURIComponent(token)}`);
    if (dataRes.ok) {
      const data = await dataRes.json();
      const name = [data?.cvCtx?.firstName, data?.cvCtx?.lastName].filter(Boolean).join(' ');
      const role = data?.role || 'Interview';
      const pct = Math.round(data?.overallScore || 0);

      const title = escapeHtml(
        name ? `Watch ${name}'s ${role} interview — InterviewMe.global` : `Watch this ${role} interview — InterviewMe.global`
      );
      const description = escapeHtml(
        `Scored ${pct}/100 on InterviewMe.global — the world's first interview broadcast platform. Watch the full interview.`
      );
      const url = `${origin}/shared/${encodeURIComponent(token)}`;

      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = replaceMetaContent(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, title);
      html = replaceMetaContent(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, description);
      html = replaceMetaContent(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, url);
      html = replaceMetaContent(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, FALLBACK_IMAGE);
      html = replaceMetaContent(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, title);
      html = replaceMetaContent(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, description);
      html = replaceMetaContent(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, FALLBACK_IMAGE);
    }
    // Session not found / API unreachable — fall through and serve the generic shell,
    // exactly what the SPA would have shown anyway at this URL.
  } catch (err) {
    context.log.warn('share-meta: could not fetch interview data, serving generic shell', err);
  }

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    body: html,
  };
};
