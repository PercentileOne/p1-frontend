const DID_BASE = 'https://api.d-id.com';

const PRESENTER_IMAGES = {
  hr: 'https://recruiter.explain.global/images/sarah.png',
  technical: 'https://recruiter.explain.global/images/james.png',
};

const DID_VOICES = {
  hr: 'en-GB-SoniaNeural',
  technical: 'en-GB-RyanNeural',
};

module.exports = async function (context, req) {
  const { text, role = 'technical', talkId } = req.body ?? {};
  const DID_KEY = process.env.DID_API_KEY;

  if (!DID_KEY) {
    context.res = { status: 503, body: 'D-ID not configured' };
    return;
  }

  const authHeader = `Basic ${Buffer.from(DID_KEY).toString('base64')}`;
  const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

  // Phase 2: poll for existing talk
  if (talkId) {
    const pollRes = await fetch(`${DID_BASE}/talks/${talkId}`, { headers });
    const data = await pollRes.json();
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
    return;
  }

  // Phase 1: create the talk
  if (!text) {
    context.res = { status: 400, body: 'Missing text' };
    return;
  }

  try {
    const createRes = await fetch(`${DID_BASE}/talks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
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
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      context.res = { status: createRes.status, body: `D-ID ${createRes.status}: ${err}` };
      return;
    }

    const { id } = await createRes.json();
    context.res = {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ talkId: id }),
    };
  } catch (err) {
    context.res = { status: 500, body: String(err) };
  }
};
