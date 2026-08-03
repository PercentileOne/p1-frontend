// Azure Function — POST /api/ai-proxy
// Server-side proxy for OpenAI chat completions.
// Keeps the API key out of the browser bundle and avoids CORS issues.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: CORS_HEADERS };
    return;
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    context.res = {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'AI not configured on server' }),
    };
    return;
  }

  const body = req.body;
  if (!body?.messages) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'messages required' }),
    };
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    context.res = {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify(data),
    };
  } catch (err) {
    context.log.error('ai-proxy error:', err.message);
    context.res = {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ error: 'Upstream OpenAI request failed', detail: err.message }),
    };
  }
};
