// Azure Function — GET /api/share-meta/{token}, reached via staticwebapp.config.json rewrites:
//   /shared/*        → /api/share-meta/shared   a shared interview, or a shared CV analysis (/shared/cv-analysis/<token>); the token is read from the original address
//   /watch           → /api/share-meta/watch     a shared feed video (/watch?v=VIDEOID), added 2026-10-18
// Either way it serves the SAME built index.html (so the real SPA still boots identically for humans) with just the <title>/og:*/twitter:* tags patched to describe this specific
// interview or video — otherwise every shared link on LinkedIn, Slack, WhatsApp etc. shows the same generic homepage preview, since those crawlers never run JavaScript and only
// ever see whatever static HTML index.html always contains.
// This is the one Node.js function the project allows (see CLAUDE.md section 2). The video mode extends it rather than adding a second one: Francis chose that on 2026-10-18.
// The real backend address, the same one every portal uses. The old default here, explain-api.azurewebsites.net, does not exist, so this function could never reach the API unless
// an app setting overrode it (found 2026-10-18). The EXPLAIN_API_URL app setting still wins if one is set.
const EXPLAIN_API_URL = process.env.EXPLAIN_API_URL || 'https://api.explain.global';
const FALLBACK_IMAGE = 'https://www.theinterviewchair.com/social-card.png';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CANONICAL_ORIGIN = 'https://candidate.theinterviewchair.com';
// Where the generated CV card pictures are served from (Features/CvAnalysis, GET /cv-card/{token}.png).
const CARD_IMAGE_BASE = 'https://api.theinterviewchair.com';
// Only our own candidate-portal addresses (and localhost for development) may be used to fetch the app shell.
const KNOWN_HOST = /^(candidate\.(theinterviewchair\.com|explain\.global|interviewme\.global)|localhost(:\d+)?)$/i;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// A function as the replacement, never a string: in a replacement STRING a "$&", "$'" or "$`" in the text is read as a pattern and mangles the tag, and video titles do contain "$".
function replaceMetaContent(html, selectorRegex, content) {
  return html.replace(selectorRegex, (tag) => tag.replace(/content="[^"]*"/, () => `content="${content}"`));
}

// Patches the title and the Open Graph / Twitter tags. Values are escaped here. `imageWidth`/`imageHeight` are only for images that are not the shell's 1200x630 card.
function patchMeta(html, { title, description, url, image, imageWidth, imageHeight }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  html = html.replace(/<title>.*?<\/title>/, () => `<title>${t}</title>`);
  html = replaceMetaContent(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, t);
  html = replaceMetaContent(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, d);
  html = replaceMetaContent(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, escapeHtml(url));
  html = replaceMetaContent(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, escapeHtml(image));
  if (imageWidth) html = replaceMetaContent(html, /<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i, String(imageWidth));
  if (imageHeight) html = replaceMetaContent(html, /<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i, String(imageHeight));
  html = replaceMetaContent(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, t);
  html = replaceMetaContent(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, d);
  html = replaceMetaContent(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, escapeHtml(image));
  return html;
}

// The public address of the request. Inside the function, `Host` is the function's own internal address, not ours: fetching the app shell from it returned an empty page (found 2026-10-18,
// the first time a rewrite actually reached this function). Static Web Apps passes the original address in x-ms-original-url, so that is read first, then x-forwarded-host, and the result
// must be one of our own hosts, otherwise the canonical candidate address is used.
function originFrom(req) {
  const headers = (req && req.headers) || {};
  let host = null;
  try { host = new URL(headers['x-ms-original-url']).host; } catch { /* no original address */ }
  if (!host) host = headers['x-forwarded-host'] || headers.host || '';
  host = String(host).split(',')[0].trim();
  if (!KNOWN_HOST.test(host)) return CANONICAL_ORIGIN;
  return /^localhost/i.test(host) ? `http://${host}` : `https://${host}`;
}

// The interview token from the original address, only when it is exactly /shared/<token>. Static Web Apps cannot pass a path segment through a rewrite, so every /shared/* address reaches
// the function as "shared" and this reads the real one. Longer addresses (/shared/cv-analysis/<token>) are other pages and get the plain app shell, untouched.
function interviewTokenFrom(req) {
  try {
    const m = new URL(req.headers['x-ms-original-url']).pathname.match(/^\/shared\/([^/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

// The token of a shared CV analysis, only when the address is exactly /shared/cv-analysis/<token>.
function cvTokenFrom(req) {
  try {
    const m = new URL(req.headers['x-ms-original-url']).pathname.match(/^\/shared\/cv-analysis\/([^/]+)\/?$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

// What a shared CV analysis says when its link is pasted somewhere: the person's name, their top skills and the roles that fit, from the same positives-only view the page shows.
// Weaknesses are never in it, because the server never sends them for a candidate's or anonymous share.
function cvMeta(view, token, origin) {
  const skills = [...(view.analysis?.skills || [])].sort((a, b) => b.level - a.level).slice(0, 3).map((s) => s.name);
  const roles = view.roleMatches || [];
  const parts = [];
  if (skills.length) parts.push(`Top skills: ${skills.length > 1 ? skills.slice(0, -1).join(', ') + ' and ' + skills[skills.length - 1] : skills[0]}.`);
  if (roles.length) parts.push(`Fits ${roles.length} role${roles.length === 1 ? '' : 's'}, including ${roles[0].careerTitle}.`);
  parts.push('Get your own free CV analysis at TheInterviewChair.com.');
  return {
    title: view.candidateName ? `CV Analysis for ${view.candidateName} — TheInterviewChair.com` : 'A CV Analysis — TheInterviewChair.com',
    description: parts.join(' '),
    url: `${origin}/shared/cv-analysis/${encodeURIComponent(token)}`,
    // The person's own card: their name, top skills and roles, drawn on the server from the same positives-only view (1200 x 630).
    image: `${CARD_IMAGE_BASE}/cv-card/${encodeURIComponent(token)}.png`,
    imageWidth: 1200,
    imageHeight: 630,
  };
}

// The video id from /watch?v=…, read from the query or, if the rewrite dropped it, from the original address Static Web Apps passes along. Anything that is not an
// 11-character YouTube id is ignored, so nothing else can reach the page's tags.
function videoIdFrom(req) {
  let v = req && req.query && req.query.v;
  if (!v) {
    try { v = new URL(req.headers['x-ms-original-url']).searchParams.get('v'); } catch { /* no original address */ }
  }
  return typeof v === 'string' && VIDEO_ID.test(v) ? v : null;
}

// What the shared video's preview says. Built only from a video in our own published list, never from the address.
function videoMeta(video, origin, hd = true) {
  return {
    title: `${video.title} — TheInterviewChair.com`,
    description: `From ${video.channel} on YouTube. Watch it free on TheInterviewChair.com, then practise your next interview with an AI interviewer who talks back.`,
    url: `${origin}/watch?v=${video.id}`,
    // Not every video has the 720p picture; the standard one always exists (it has black bars, but is better than a broken image).
    image: `https://i.ytimg.com/vi/${video.id}/${hd ? 'hq720' : 'hqdefault'}.jpg`,
    imageWidth: hd ? 1280 : 480,
    imageHeight: hd ? 720 : 360,
  };
}

async function patchForInterview(html, token, origin) {
  const dataRes = await fetch(`${EXPLAIN_API_URL}/api/interviews/shared/${encodeURIComponent(token)}`);
  if (!dataRes.ok) return html;   // Session not found — serve the generic shell, exactly what the SPA would have shown anyway at this URL.
  const data = await dataRes.json();
  const name = [data?.cvCtx?.firstName, data?.cvCtx?.lastName].filter(Boolean).join(' ');
  const role = data?.role || 'Interview';
  const pct = Math.round(data?.overallScore || 0);
  return patchMeta(html, {
    title: name ? `Watch ${name}'s ${role} interview — TheInterviewChair.com` : `Watch this ${role} interview — TheInterviewChair.com`,
    description: `Scored ${pct}/100 on TheInterviewChair.com — the world's first interview broadcast platform. Watch the full interview.`,
    url: `${origin}/shared/${encodeURIComponent(token)}`,
    image: FALLBACK_IMAGE,
  });
}

async function patchForCvAnalysis(html, token, origin) {
  const dataRes = await fetch(`${EXPLAIN_API_URL}/api/cv-analysis/history/shared/${encodeURIComponent(token)}`);
  if (!dataRes.ok) return html;
  const view = await dataRes.json();
  // A recruiter's share is a hiring assessment of a named candidate, passed between colleagues. It gets no public preview.
  if (!view || view.positivesOnly !== true) return html;
  return patchMeta(html, cvMeta(view, token, origin));
}

async function patchForVideo(html, req, origin) {
  const id = videoIdFrom(req);
  if (!id) return html;
  // The public list is empty while the public Watch page is switched off, so a preview is only ever made for a video that is on public show.
  const dataRes = await fetch(`${EXPLAIN_API_URL}/api/public/feed/videos`);
  if (!dataRes.ok) return html;
  const data = await dataRes.json();
  const video = (data?.videos || []).find((v) => v.id === id);
  if (!video) return html;
  let hd = true;
  try { hd = (await fetch(`https://i.ytimg.com/vi/${video.id}/hq720.jpg`, { method: 'HEAD' })).ok; } catch { hd = false; }
  return patchMeta(html, videoMeta(video, origin, hd));
}

module.exports = async function (context, req) {
  const token = context.bindingData.token;
  const origin = originFrom(req);

  // The app shell. It must really be the page: an empty or error answer would blank the whole site at this address, so it is retried once from the canonical address and otherwise refused.
  let html = null;
  for (const base of origin === CANONICAL_ORIGIN ? [origin] : [origin, CANONICAL_ORIGIN]) {
    try {
      const shellRes = await fetch(`${base}/index.html`);
      const text = shellRes.ok ? await shellRes.text() : '';
      if (text.includes('<html')) { html = text; break; }
    } catch (err) {
      context.log.warn(`share-meta: could not fetch the app shell from ${base}`, err);
    }
  }
  if (html === null) {
    context.log.error('share-meta: failed to fetch index.html shell');
    context.res = { status: 502, body: 'Failed to load app shell' };
    return;
  }

  try {
    if (token === 'watch') html = await patchForVideo(html, req, origin);
    else if (token === 'shared') {
      const cv = cvTokenFrom(req);
      const t = cv ? null : interviewTokenFrom(req);
      if (cv) html = await patchForCvAnalysis(html, cv, origin);
      else if (t) html = await patchForInterview(html, t, origin);
    }
    else html = await patchForInterview(html, token, origin);
  } catch (err) {
    // API unreachable — fall through and serve the generic shell.
    context.log.warn('share-meta: could not fetch data, serving generic shell', err);
  }

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    body: html,
  };
};

// Exposed for the tests in video-meta-test.js; not used by Azure.
module.exports.__test = { patchMeta, videoIdFrom, videoMeta, replaceMetaContent, escapeHtml, originFrom, interviewTokenFrom, cvTokenFrom, cvMeta };
