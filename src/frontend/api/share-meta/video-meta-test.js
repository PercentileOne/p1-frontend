// Run with:  node --test api/share-meta/video-meta-test.js   (from src/frontend). Plain Node test runner, no packages.
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('./index.js');
const { patchMeta, videoIdFrom, videoMeta, originFrom } = handler.__test;

const SHELL = `<!doctype html><html><head>
<title>TheInterviewChair.com — The World's First Interview Broadcast Platform</title>
<meta property="og:type" content="website" />
<meta property="og:url" content="https://candidate.theinterviewchair.com" />
<meta property="og:title" content="Generic title" />
<meta property="og:description" content="Generic description" />
<meta property="og:image" content="https://www.theinterviewchair.com/social-card.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Generic title" />
<meta name="twitter:description" content="Generic description" />
<meta name="twitter:image" content="https://www.theinterviewchair.com/social-card.png" />
</head><body><div id="root"></div></body></html>`;

const ID = 'dQw4w9WgXcQ';
const VIDEO = { id: ID, title: 'This Kid Turned Cardboard Boxes Into a $35K Business Deal', channel: 'Shark Tank Global' };

// Runs the real handler against a fake shell and a fake API, the way Azure would.
async function run({ token = 'watch', query = { v: ID }, headers = {}, videos = [VIDEO], apiOk = true, apiThrows = false, noHd = false } = {}) {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).endsWith('/index.html')) return { ok: true, text: async () => SHELL };
    if (String(url).includes('i.ytimg.com')) return { ok: noHd ? false : true };
    if (String(url).includes('/api/public/feed/videos')) {
      if (apiThrows) throw new Error('down');
      return { ok: apiOk, json: async () => ({ enabled: true, videos }) };
    }
    return { ok: false, json: async () => ({}) };
  };
  const context = { bindingData: { token }, log: Object.assign(() => {}, { error() {}, warn() {} }) };
  try {
    await handler(context, { headers: { host: 'candidate.theinterviewchair.com', ...headers }, query });
  } finally { global.fetch = realFetch; }
  return context.res;
}

test('a shared video link gets that video\'s title, channel, link and picture', async () => {
  const res = await run();
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>This Kid Turned Cardboard Boxes Into a \$35K Business Deal — TheInterviewChair\.com<\/title>/);
  assert.match(res.body, /og:title" content="This Kid Turned Cardboard Boxes Into a \$35K Business Deal — TheInterviewChair\.com"/);
  assert.match(res.body, /og:description" content="From Shark Tank Global on YouTube\./);
  assert.ok(res.body.includes(`og:url" content="https://candidate.theinterviewchair.com/watch?v=${ID}"`));
  assert.ok(res.body.includes(`og:image" content="https://i.ytimg.com/vi/${ID}/hq720.jpg"`));
  assert.ok(res.body.includes(`twitter:image" content="https://i.ytimg.com/vi/${ID}/hq720.jpg"`));
  assert.match(res.body, /og:image:width" content="1280"/);
  assert.match(res.body, /og:image:height" content="720"/);
  assert.match(res.body, /<div id="root"><\/div>/);   // the app still boots
});

test('dollar-sign patterns in a title cannot mangle the tags', async () => {
  const res = await run({ videos: [{ id: ID, title: "Win $& $' $` $$ now", channel: 'X' }] });
  assert.ok(res.body.includes("Win $&amp; $&#39; $` $$ now — TheInterviewChair.com"), res.body.slice(0, 400));
  assert.equal((res.body.match(/<title>/g) || []).length, 1);
});

test('HTML in a title or channel is escaped', async () => {
  const res = await run({ videos: [{ id: ID, title: '<script>alert(1)</script> "hi"', channel: 'A&B' }] });
  assert.ok(!res.body.includes('<script>alert'));
  assert.ok(res.body.includes('&lt;script&gt;alert(1)&lt;/script&gt; &quot;hi&quot;'));
  assert.ok(res.body.includes('From A&amp;B on YouTube'));
});

test('the video id can come from the original address if the rewrite drops the query', async () => {
  const res = await run({ query: {}, headers: { 'x-ms-original-url': `https://candidate.theinterviewchair.com/watch?v=${ID}&utm_source=share` } });
  assert.ok(res.body.includes(`og:url" content="https://candidate.theinterviewchair.com/watch?v=${ID}"`));
});

test('a video that is not on public show, or a bad id, gets the plain shell', async () => {
  for (const res of [await run({ videos: [] }), await run({ query: { v: 'not-an-id' } }), await run({ query: {} }), await run({ query: { v: ID }, apiOk: false }), await run({ apiThrows: true })]) {
    assert.equal(res.status, 200);
    assert.match(res.body, /og:title" content="Generic title"/);
    assert.match(res.body, /social-card\.png/);
  }
});

test('an id with markup in it never reaches the page', () => {
  assert.equal(videoIdFrom({ query: { v: '"><script>x' }, headers: {} }), null);
  assert.equal(videoIdFrom({ query: { v: ID }, headers: {} }), ID);
  assert.equal(videoIdFrom({ query: { v: [ID, ID] }, headers: {} }), null);
});

test('a shared interview still gets its own preview (unchanged behaviour)', async () => {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).endsWith('/index.html')) return { ok: true, text: async () => SHELL };
    return { ok: true, json: async () => ({ role: 'Nurse', overallScore: 82.4, cvCtx: { firstName: 'Sam', lastName: 'Jones' } }) };
  };
  const context = { bindingData: { token: 'abc123' }, log: Object.assign(() => {}, { error() {}, warn() {} }) };
  try { await handler(context, { headers: { host: 'candidate.theinterviewchair.com' }, query: {} }); } finally { global.fetch = realFetch; }
  assert.match(context.res.body, /Watch Sam Jones&#39;s Nurse interview/);
  assert.match(context.res.body, /Scored 82\/100/);
  assert.ok(context.res.body.includes('og:url" content="https://candidate.theinterviewchair.com/shared/abc123"'));
  assert.match(context.res.body, /og:image:width" content="1200"/);   // the interview card keeps its own size
});

test('videoMeta builds the link without the share tags', () => {
  const m = videoMeta(VIDEO, 'https://candidate.theinterviewchair.com');
  assert.equal(m.url, `https://candidate.theinterviewchair.com/watch?v=${ID}`);
  assert.equal(patchMeta(SHELL, { ...m }).includes('Generic title'), false);
});

// The routing file that is actually deployed is public/staticwebapp.config.json (the build copies it into dist, which is what the workflows upload).
// The copy at the project root is NOT deployed, which is how the /shared rewrite there went unnoticed. This keeps /watch in the file that ships.
test('the deployed routing file is valid JSON and sends /watch to share-meta', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'staticwebapp.config.json'), 'utf8'));
  const route = config.routes.find((r) => r.route === '/watch');
  assert.ok(route, '/watch route missing from public/staticwebapp.config.json');
  assert.equal(route.rewrite, '/api/share-meta/watch');
});

test('the public address comes from the original request, not the function\'s own internal host', () => {
  const internal = { host: 'explain-func-abc123.azurewebsites.net' };
  assert.equal(originFrom({ headers: { ...internal, 'x-ms-original-url': 'https://candidate.theinterviewchair.com/watch?v=x' } }), 'https://candidate.theinterviewchair.com');
  assert.equal(originFrom({ headers: { ...internal, 'x-forwarded-host': 'candidate.explain.global' } }), 'https://candidate.explain.global');
  assert.equal(originFrom({ headers: { ...internal } }), 'https://candidate.theinterviewchair.com');          // internal host never used
  assert.equal(originFrom({ headers: { 'x-forwarded-host': 'evil.example.com' } }), 'https://candidate.theinterviewchair.com');   // not one of ours
  assert.equal(originFrom({ headers: { 'x-forwarded-host': 'localhost:5173' } }), 'http://localhost:5173');
  assert.equal(originFrom({}), 'https://candidate.theinterviewchair.com');
});

test('an empty or failed app shell is never passed on as the page', async () => {
  const realFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => { calls.push(String(url)); return { ok: true, text: async () => '' }; };
  const context = { bindingData: { token: 'watch' }, log: Object.assign(() => {}, { error() {}, warn() {} }) };
  try { await handler(context, { headers: { host: 'internal.azurewebsites.net' }, query: { v: ID } }); } finally { global.fetch = realFetch; }
  assert.equal(context.res.status, 502);
  assert.ok(calls.every((u) => u.endsWith('/index.html')));
});

test('if the first address gives no page, the canonical address is tried', async () => {
  const realFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url) === 'https://candidate.explain.global/index.html') return { ok: false, text: async () => '' };
    if (String(url) === 'https://candidate.theinterviewchair.com/index.html') return { ok: true, text: async () => SHELL };
    return { ok: false, json: async () => ({}) };
  };
  const context = { bindingData: { token: 'watch' }, log: Object.assign(() => {}, { error() {}, warn() {} }) };
  try { await handler(context, { headers: { 'x-forwarded-host': 'candidate.explain.global' }, query: {} }); } finally { global.fetch = realFetch; }
  assert.equal(context.res.status, 200);
  assert.match(context.res.body, /<div id="root">/);
});

test('a video with no 720p picture falls back to the standard one, with its own size', async () => {
  const res = await run({ noHd: true });
  assert.ok(res.body.includes(`og:image" content="https://i.ytimg.com/vi/${ID}/hqdefault.jpg"`));
  assert.match(res.body, /og:image:width" content="480"/);
  assert.match(res.body, /og:image:height" content="360"/);
});
