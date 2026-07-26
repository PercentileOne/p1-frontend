const https = require('https');

const DID_BASE_HOST = 'api.d-id.com';

const PRESENTER_IMAGES = {
  hr: 'https://recruiter.explain.global/images/sarah.png',
  technical: 'https://recruiter.explain.global/images/james.png',
  agent: 'https://recruiter.explain.global/images/mike.png',
};

const DID_VOICES = {
  hr: 'en-GB-SoniaNeural',
  technical: 'en-GB-RyanNeural',
  agent: 'en-GB-OliverNeural',
};

function didRequest(method, path, body, authHeader) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: DID_BASE_HOST,
      path,
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = async function (context, req) {
  const { text, role = 'technical', talkId } = req.body ?? {};
  const DID_KEY = process.env.DID_API_KEY;

  if (!DID_KEY) {
    context.res = { status: 503, body: 'D-ID not configured' };
    return;
  }

  const authHeader = `Basic ${Buffer.from(DID_KEY).toString('base64')}`;

  // Phase 2: poll for existing talk
  if (talkId) {
    try {
      const { status, body } = await didRequest('GET', `/talks/${talkId}`, null, authHeader);
      const data = JSON.parse(body);
      if (data.status === 'done' && data.result_url) {
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done', videoUrl: data.result_url }),
        };
      } else if (data.status === 'error') {
        context.res = { status: 500, body: JSON.stringify({ status: 'error' }) };
      } else {
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: data.status ?? 'pending' }),
        };
      }
    } catch (err) {
      context.res = { status: 500, body: String(err) };
    }
    return;
  }

  // Phase 1: create the talk
  if (!text) {
    context.res = { status: 400, body: 'Missing text' };
    return;
  }

  try {
    const { status, body } = await didRequest('POST', '/talks', {
      source_url: PRESENTER_IMAGES[role] ?? PRESENTER_IMAGES.technical,
      script: {
        type: 'text',
        input: text,
        provider: {
          type: 'microsoft',
          voice_id: DID_VOICES[role] ?? DID_VOICES.technical,
        },
      },
      config: { fluent: true, pad_audio: 0 },
    }, authHeader);

    if (status < 200 || status >= 300) {
      context.res = { status, body: `D-ID ${status}: ${body}` };
      return;
    }

    const { id } = JSON.parse(body);
    context.res = {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ talkId: id }),
    };
  } catch (err) {
    context.res = { status: 500, body: String(err) };
  }
};
