const DID_BASE = 'https://api.d-id.com';

const PRESENTER_IMAGES = {
  hr: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
  technical: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
};

const DID_VOICES = {
  hr: 'en-GB-SoniaNeural',
  technical: 'en-GB-RyanNeural',
};

module.exports = async function (context, req) {
  const { text, role = 'technical' } = req.body ?? {};
  const DID_KEY = process.env.DID_API_KEY;

  if (!DID_KEY) {
    context.res = { status: 503, body: 'D-ID not configured — DID_API_KEY env var missing' };
    return;
  }
  if (!text) {
    context.res = { status: 400, body: 'Missing text' };
    return;
  }

  // DID_KEY should already be base64(email:apikey) — use directly in Basic auth
  const authHeader = `Basic ${DID_KEY}`;
  const keyPreview = DID_KEY.substring(0, 8) + '...' + DID_KEY.substring(DID_KEY.length - 4);

  const headers = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  };

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
      context.res = { status: createRes.status, body: `D-ID ${createRes.status}: ${err} [key:${keyPreview}]` };
      return;
    }

    const { id } = await createRes.json();

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const pollRes = await fetch(`${DID_BASE}/talks/${id}`, { headers });
      const data = await pollRes.json();
      if (data.status === 'done' && data.result_url) {
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: data.result_url }),
        };
        return;
      }
      if (data.status === 'error') {
        context.res = { status: 500, body: 'D-ID render failed' };
        return;
      }
    }

    context.res = { status: 504, body: 'D-ID timed out' };
  } catch (err) {
    context.res = { status: 500, body: String(err) };
  }
};
