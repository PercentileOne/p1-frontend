const BG    = '#050d20';
const NAVY  = '#071228';
const SURF  = '#0d1f45';
const BLUE  = '#4F8EF7';
const MUTED = 'rgba(160,200,255,0.6)';
const BORD  = 'rgba(79,142,247,0.15)';

const SECTIONS = [
  { id: 'overview',       label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'rate-limits',    label: 'Rate Limits' },
  { id: 'errors',         label: 'Errors' },
  { id: 'tenants',        label: 'Tenants' },
  { id: 'candidates',     label: 'Candidates' },
  { id: 'jobs',           label: 'Jobs' },
  { id: 'packs',          label: 'Interview Packs' },
  { id: 'sessions',       label: 'Sessions' },
  { id: 'webhooks',       label: 'Webhooks' },
  { id: 'branding',       label: 'Branding' },
  { id: 'sdks',           label: 'SDKs' },
  { id: 'guides',         label: 'Integration Guides' },
];

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const METHOD_COLORS: Record<Method, { bg: string; color: string; border: string }> = {
  GET:    { bg: 'rgba(52,211,153,0.12)',  color: '#34D399', border: 'rgba(52,211,153,0.3)' },
  POST:   { bg: 'rgba(79,142,247,0.12)', color: BLUE,      border: 'rgba(79,142,247,0.3)' },
  PATCH:  { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  DELETE: { bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.25)' },
};

function MethodBadge({ method }: { method: Method }) {
  const c = METHOD_COLORS[method];
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, Cascadia Code, Fira Code, monospace',
      fontSize: 11, fontWeight: 700,
      padding: '3px 8px', borderRadius: 4,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      flexShrink: 0,
    }}>{method}</span>
  );
}

interface EndpointCardProps {
  method: Method;
  path: string;
  desc: string;
  code: string;
}

function EndpointCard({ method, path, desc, code }: EndpointCardProps) {
  // colour path params
  const pathEl = path.split(/(\{[^}]+\})/).map((part, i) =>
    part.startsWith('{')
      ? <span key={i} style={{ color: BLUE }}>{part}</span>
      : <span key={i}>{part}</span>
  );

  return (
    <div style={{ border: `1px solid ${BORD}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#040e22', borderBottom: `1px solid ${BORD}`, flexWrap: 'wrap' }}>
        <MethodBadge method={method} />
        <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#f0f4ff' }}>{pathEl}</code>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>{desc}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '16px 20px', borderRight: `1px solid ${BORD}`, fontSize: 13, color: MUTED, lineHeight: 1.8 }}>
          {desc}. See the full reference in the <a href="#resources" style={{ color: BLUE }}>resources section</a> below.
        </div>
        <div style={{ background: '#030b1a' }}>
          <div style={{ padding: '7px 14px', borderBottom: `1px solid ${BORD}`, fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.04em' }}>EXAMPLE</div>
          <pre style={{ fontFamily: 'JetBrains Mono, Cascadia Code, monospace', fontSize: 11.5, lineHeight: 1.7, padding: '14px 16px', color: '#c8d8f8', overflow: 'auto', margin: 0 }}>{code}</pre>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ id, eyebrow, title, intro }: { id: string; eyebrow: string; title: string; intro: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div id={id} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 6 }}>{eyebrow}</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.75, maxWidth: 620 }}>{intro}</p>
    </div>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: '#040e22', border: `1px solid ${BORD}`, borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BLUE, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4ff' }}>{value}</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: `3px solid ${BLUE}`, background: 'rgba(79,142,247,0.08)', borderRadius: '0 8px 8px 0', padding: '12px 16px', margin: '14px 0', fontSize: 13, color: 'rgba(200,220,255,0.85)', lineHeight: 1.65 }}>
      {children}
    </div>
  );
}

export default function Developer() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>

      {/* ── Sidebar ── */}
      <nav style={{ width: 240, flexShrink: 0, background: NAVY, borderRight: `1px solid ${BORD}`, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '22px 18px 18px', borderBottom: `1px solid ${BORD}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f0f4ff' }}>
            Explain<span style={{ color: BLUE }}>.Global</span>
          </div>
          <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', background: 'rgba(79,142,247,0.15)', border: `1px solid rgba(79,142,247,0.3)`, borderRadius: 20, fontSize: 10, fontWeight: 700, color: BLUE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Partner API · v1
          </div>
        </div>
        <div style={{ padding: '10px 0 20px', flex: 1 }}>
          <div style={{ padding: '12px 18px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(160,200,255,0.3)' }}>Getting Started</div>
          {['overview', 'authentication', 'rate-limits', 'errors'].map(id => (
            <a key={id} href={`#${id}`} style={{ display: 'block', padding: '6px 18px', fontSize: 13, color: MUTED, textDecoration: 'none' }}
               onMouseEnter={e => (e.currentTarget.style.color = '#f0f4ff')}
               onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
              {SECTIONS.find(s => s.id === id)?.label}
            </a>
          ))}
          <div style={{ padding: '12px 18px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(160,200,255,0.3)', marginTop: 4 }}>API Resources</div>
          {['tenants','candidates','jobs','packs','sessions','webhooks','branding'].map(id => (
            <a key={id} href={`#${id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 18px', fontSize: 13, color: MUTED, textDecoration: 'none' }}
               onMouseEnter={e => (e.currentTarget.style.color = '#f0f4ff')}
               onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE, flexShrink: 0, opacity: 0.7 }} />
              {SECTIONS.find(s => s.id === id)?.label}
            </a>
          ))}
          <div style={{ padding: '12px 18px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(160,200,255,0.3)', marginTop: 4 }}>Resources</div>
          {['sdks','guides'].map(id => (
            <a key={id} href={`#${id}`} style={{ display: 'block', padding: '6px 18px', fontSize: 13, color: MUTED, textDecoration: 'none' }}
               onMouseEnter={e => (e.currentTarget.style.color = '#f0f4ff')}
               onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
              {SECTIONS.find(s => s.id === id)?.label}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* Hero */}
        <div style={{ padding: '60px 60px 48px', borderBottom: `1px solid ${BORD}`, background: `linear-gradient(160deg, #07112a 0%, ${BG} 100%)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 12 }}>✦ Partner API Documentation</div>
          <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#fff', marginBottom: 14 }}>
            Explain as <span style={{ color: BLUE }}>Interview Infrastructure</span>
          </h1>
          <p style={{ fontSize: 15, color: MUTED, maxWidth: 580, lineHeight: 1.7, marginBottom: 28 }}>
            Embed AI-powered interview intelligence directly into your product. You own the UI and the brand. Explain powers the engine — question generation, scoring, transcription, and insights.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['RESTful · JSON', 'OAuth 2.0 / API Keys', 'Multi-tenant', 'White-label ready', 'Webhook events'].map(t => (
              <span key={t} style={{ padding: '4px 12px', border: `1px solid ${BORD}`, borderRadius: 20, fontSize: 12, color: MUTED, background: 'rgba(79,142,247,0.06)' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Overview */}
        <div id="overview" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="overview-head" eyebrow="Overview" title="Base URL & Versioning" intro="All API endpoints are versioned via path prefix. The current stable version is v1. Breaking changes ship under v2 with a 6-month deprecation notice." />
          <div style={{ background: SURF, border: `1px solid ${BORD}`, borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Base URL</span>
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#f0f4ff' }}>https://api.explain.global/api/v1/</code>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12 }}>
            <InfoCard label="Protocol" value="HTTPS only" sub="TLS 1.2+ enforced" />
            <InfoCard label="Format" value="JSON" sub="Content-Type: application/json" />
            <InfoCard label="Versioning" value="Path-based" sub="/api/v1/ · /api/v2/ (future)" />
            <InfoCard label="Tenancy" value="Header-scoped" sub="X-Tenant-Id on every request" />
          </div>
        </div>

        {/* Authentication */}
        <div id="authentication" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="auth-head" eyebrow="Authentication" title="OAuth 2.0 & API Keys" intro="Enterprise integrations (ATS platforms, LinkedIn) should use OAuth 2.0 client credentials. Simpler single-tenant partners may use scoped API keys." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, overflowX: 'auto' }}>
            {['Client credentials', 'POST /oauth/token', 'Bearer token', 'API requests'].map((step, i, arr) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ background: SURF, border: `1px solid ${BORD}`, borderRadius: 10, padding: '12px 16px', minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: BLUE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>0{i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f4ff' }}>{step}</div>
                </div>
                {i < arr.length - 1 && <span style={{ fontSize: 18, color: BORD, padding: '0 8px' }}>→</span>}
              </div>
            ))}
          </div>
          <EndpointCard
            method="POST"
            path="/oauth/token"
            desc="Exchange credentials for a bearer token"
            code={`{
  "grant_type":    "client_credentials",
  "client_id":     "cid_your_client_id",
  "client_secret": "cs_your_client_secret",
  "scope":         "packs:generate sessions:score"
}

// Response
{
  "access_token": "eyJhbGci...",
  "token_type":   "Bearer",
  "expires_in":   3600
}`}
          />
          <Callout>
            <strong style={{ color: '#fff' }}>Required headers on every request:</strong>{' '}
            <code style={{ color: '#93c5fd', fontFamily: 'monospace' }}>Authorization: Bearer &lt;token&gt;</code> and{' '}
            <code style={{ color: '#93c5fd', fontFamily: 'monospace' }}>X-Tenant-Id: tenant_your_id</code>
          </Callout>
        </div>

        {/* Rate Limits */}
        <div id="rate-limits" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="rl-head" eyebrow="Infrastructure" title="Rate Limits" intro="Rate limits are applied per tenant. Exceeded limits return 429 Too Many Requests with a Retry-After header." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
            {[['Starter','500','requests / minute'],['Growth','2,000','requests / minute'],['Enterprise','Custom','negotiated SLA']].map(([tier, limit, unit]) => (
              <div key={tier} style={{ background: '#040e22', border: `1px solid ${BORD}`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, marginBottom: 4 }}>{tier}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', letterSpacing: '-0.02em' }}>{limit}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        <div id="errors" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="err-head" eyebrow="Errors" title="Structured Error Responses" intro="All errors follow a consistent envelope. Never parse HTTP status codes alone — always check error.code for programmatic handling." />
          <div style={{ background: '#030b1a', border: `1px solid ${BORD}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${BORD}`, fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: '0.04em' }}>ERROR ENVELOPE</div>
            <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, lineHeight: 1.7, padding: '16px 18px', color: '#c8d8f8', margin: 0 }}>{`{
  "error": {
    "code":      "VALIDATION_ERROR",
    "message":   "Email is required.",
    "details":   [{ "field": "email", "issue": "missing" }],
    "requestId": "req_01HZ9K3X2F9Q7G8J4M5N6P7R"
  }
}`}</pre>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['HTTP', 'error.code', 'Description'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED, borderBottom: `1px solid ${BORD}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['400','VALIDATION_ERROR','Request fields failed validation. Check details[].'],
                ['401','UNAUTHORIZED','Missing or invalid bearer token.'],
                ['403','FORBIDDEN','Token lacks required scope.'],
                ['404','NOT_FOUND','Resource not found in your tenant.'],
                ['429','RATE_LIMITED','Rate limit exceeded. Respect Retry-After.'],
                ['500','INTERNAL_ERROR','Server error. Include requestId when contacting support.'],
              ].map(([http, code, desc]) => (
                <tr key={code}>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(79,142,247,0.06)`, fontWeight: 700, color: '#F59E0B', fontSize: 12 }}>{http}</td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(79,142,247,0.06)`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#F87171' }}>{code}</td>
                  <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(79,142,247,0.06)`, color: MUTED }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resources */}
        <div id="tenants" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="ten-head" eyebrow="Resource · Tenants" title="Tenants" intro="Your tenant record holds your partner profile, branding configuration, webhook subscriptions, and rate limit tier. All API activity is scoped to your tenant." />
          <EndpointCard method="GET" path="/api/v1/tenants/me" desc="Retrieve your tenant profile and verify active status"
            code={`// Response 200
{
  "tenantId":     "tenant_linkedin",
  "name":         "LinkedIn Talent Solutions",
  "plan":         "enterprise",
  "status":       "active",
  "branding":     { "productName": "LinkedIn Interview Prep" },
  "webhooks":     [{ "url": "https://partner.com/webhooks/explain" }]
}`} />
          <EndpointCard method="PATCH" path="/api/v1/tenants/me" desc="Update your tenant profile"
            code={`{
  "name":         "LinkedIn Talent Solutions",
  "contactEmail": "api-team@linkedin.com"
}`} />
        </div>

        <div id="candidates" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="cand-head" eyebrow="Resource · Candidates" title="Candidates" intro="You own your candidate IDs. Explain maps them to internal IDs via externalCandidateId. You never need to store Explain's internal IDs." />
          <EndpointCard method="POST" path="/api/v1/candidates" desc="Register a new candidate in your tenant"
            code={`{
  "externalCandidateId": "rik-123",
  "firstName":           "Rik",
  "lastName":            "Smith",
  "email":               "rik@example.com"
}

// Response 201
{
  "candidateId":         "cnd_abc123",
  "externalCandidateId": "rik-123"
}`} />
          <EndpointCard method="GET" path="/api/v1/candidates/{candidateId}" desc="Get candidate by Explain ID" code={`// Response 200
{
  "candidateId":         "cnd_abc123",
  "externalCandidateId": "rik-123",
  "firstName":           "Rik",
  "lastName":            "Smith",
  "email":               "rik@example.com",
  "createdAt":           "2026-08-04T14:00:00Z"
}`} />
          <EndpointCard method="GET" path="/api/v1/candidates?externalCandidateId={id}" desc="Get candidate by your own ID" code={`// Same response shape as GET by Explain ID
// Preferred for integrations that don't persist Explain IDs`} />
        </div>

        <div id="jobs" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="jobs-head" eyebrow="Resource · Jobs" title="Jobs" intro="Submit job specifications to Explain. Richer descriptions produce higher-quality packs. Jobs are immutable — create a new record to update a spec." />
          <EndpointCard method="POST" path="/api/v1/jobs" desc="Submit a job specification for indexing"
            code={`{
  "externalJobId": "vallum-head-of-eng",
  "title":         "Head of Engineering – Digital Transformation",
  "location":      "London (Hybrid)",
  "description":   "<full job description text>",
  "requirements":  "<experience required text>",
  "source":        "Vallum Associates"
}

// Response 201
{ "jobId": "job_xyz123", "externalJobId": "vallum-head-of-eng" }`} />
        </div>

        <div id="packs" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="packs-head" eyebrow="Resource · Interview Packs" title="Interview Packs" intro="Generate tailored interview question packs for a specific candidate + job combination. Packs cover up to five interview stages and generate in 3–8 seconds." />
          <EndpointCard method="POST" path="/api/v1/packs" desc="Trigger AI-powered pack generation"
            code={`{
  "candidateId": "cnd_abc123",
  "jobId":       "job_xyz123",
  "mode":        "candidate",
  "stages":      ["HR","HiringManager","Technical","Panel","Final"],
  "language":    "en-GB"
}

// Response 200 — status: "ready"
{
  "packId":    "pack_001",
  "status":    "ready",
  "questions": [
    {
      "id":     "q1",
      "stage":  "Technical",
      "type":   "competency",
      "prompt": "Tell me about a time you led a platform modernisation..."
    }
  ]
}`} />
          <EndpointCard method="GET" path="/api/v1/packs/{packId}" desc="Retrieve a pack and all its questions" code={`// Returns full pack object with questions[],
// metadata, and generation status`} />
        </div>

        <div id="sessions" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="sess-head" eyebrow="Resource · Sessions" title="Sessions" intro="A session is a single candidate run through a pack. Use partner-UI delivery to host the experience yourself, or explain-ui to deep-link candidates into Explain's hosted flow with your branding." />
          <EndpointCard method="POST" path="/api/v1/sessions" desc="Create a practice session (partner-UI or hosted-UI)"
            code={`// partner-ui: you render questions
{
  "candidateId": "cnd_abc123",
  "packId":      "pack_001",
  "delivery":    "partner-ui"
}

// explain-ui: Explain hosts, your branding applied
{
  "candidateId": "cnd_abc123",
  "packId":      "pack_001",
  "delivery":    "explain-ui",
  "returnUrl":   "https://partner.com/results"
}
// Returns sessionUrl — redirect candidate here`} />
          <EndpointCard method="POST" path="/api/v1/sessions/{sessionId}/responses" desc="Submit answers for scoring"
            code={`{
  "responses": [{
    "questionId": "q1",
    "answerText": "In my last role...",
    "audioUrl":   "https://cdn.partner.com/audio/q1.mp3"
  }]
}
// Response: overallScore, dimensions, per-question feedback`} />
          <EndpointCard method="GET" path="/api/v1/sessions/{sessionId}" desc="Full session with scores and transcript"
            code={`{
  "sessionId":    "sess_789",
  "status":       "scored",
  "overallScore": 7.8,
  "stageBreakdown": { "Technical": 7.2, "HR": 8.1 },
  "transcript": [{ "questionId": "q1", "text": "In my last role..." }]
}`} />
        </div>

        <div id="webhooks" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="wh-head" eyebrow="Resource · Webhooks" title="Webhooks" intro="Subscribe to events so your system is notified without polling. Explain signs all payloads with an HMAC signature — verify it before processing." />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {['candidate.created','pack.generated','pack.failed','session.started','session.scored','session.failed'].map(e => (
              <span key={e} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, padding: '4px 12px', background: 'rgba(79,142,247,0.08)', border: `1px solid rgba(79,142,247,0.2)`, borderRadius: 6, color: BLUE }}>{e}</span>
            ))}
          </div>
          <EndpointCard method="POST" path="/api/v1/webhooks" desc="Register a webhook endpoint"
            code={`{
  "url":    "https://partner.com/webhooks/explain",
  "events": ["pack.generated", "session.scored"]
}

// Webhook payload delivered to your URL:
{
  "event":     "session.scored",
  "tenantId":  "tenant_your_id",
  "timestamp": "2026-08-04T14:22:00Z",
  "data": { "sessionId": "sess_789", "overallScore": 7.8 }
}`} />
          <Callout>
            <strong style={{ color: '#fff' }}>Signature verification required:</strong> Every webhook includes <code style={{ color: '#93c5fd', fontFamily: 'monospace' }}>X-Explain-Signature: sha256=&lt;hmac&gt;</code>. Verify with HMAC-SHA256 before processing. Your endpoint must respond within 10 seconds. Failed deliveries retry 5 times with exponential backoff.
          </Callout>
        </div>

        <div id="branding" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="brand-head" eyebrow="Resource · Branding" title="White-Label Branding" intro="Configure how Explain-hosted flows appear to your candidates — your colours, logo, and product name. When poweredByExplain is false (Enterprise), no Explain branding appears at all." />
          <EndpointCard method="PATCH" path="/api/v1/branding" desc="Update your white-label configuration"
            code={`{
  "primaryColor":     "#0046FF",
  "accentColor":      "#00C389",
  "buttonStyle":      "rounded",
  "logoUrl":          "https://partner.com/assets/logo.svg",
  "productName":      "Vallum Interview Prep",
  "privacyPolicyUrl": "https://partner.com/privacy",
  "poweredByExplain": true
}`} />
        </div>

        {/* SDKs */}
        <div id="sdks" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="sdk-head" eyebrow="SDKs" title="Official SDK Libraries" intro="All SDKs are server-side only. Never expose credentials in client-side code." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            {[
              { lang: 'JavaScript / TypeScript', install: 'npm install @explain/sdk', note: 'Node.js, Next.js, serverless' },
              { lang: '.NET / C#', install: 'dotnet add package Explain.Global.Sdk', note: 'ASP.NET Core, Azure Functions' },
              { lang: 'Python', install: 'pip install explain-global-sdk', note: 'FastAPI, Django, Flask' },
            ].map(({ lang, install, note }) => (
              <div key={lang} style={{ background: SURF, border: `1px solid ${BORD}`, borderRadius: 12, padding: '20px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{lang}</div>
                <code style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#86efac', background: '#040e22', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>{install}</code>
                <div style={{ fontSize: 12, color: MUTED }}>{note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Guides */}
        <div id="guides" style={{ padding: '48px 60px', borderBottom: `1px solid ${BORD}` }}>
          <SectionHead id="guides-head" eyebrow="Guides" title="Integration Guides" intro="Step-by-step guides for common partner architectures. Pick the one closest to your use case." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16 }}>
            {[
              { title: 'Partner Onboarding', desc: 'Get from zero to your first pack in 30 minutes. curl-based walkthrough.', tag: 'Start here' },
              { title: 'Recruitment Consultancy', desc: 'Add branded "Get Interview Pack" buttons to job listings. The Vallum model.', tag: 'Popular' },
              { title: 'ATS Integration', desc: 'Trigger pack generation when a candidate progresses to interview stage.', tag: 'Enterprise' },
              { title: 'Job Board', desc: 'Lazy generation with caching — serve millions of listings efficiently.', tag: 'Scale' },
              { title: 'White-Label Guide', desc: 'Full attribution-free white-labelling. Your brand, your product name.', tag: 'Enterprise' },
              { title: 'Hosted UI Flow', desc: 'Redirect candidates to Explain's hosted experience under your brand.', tag: 'Fast launch' },
            ].map(({ title, desc, tag }) => (
              <div key={title} style={{ background: SURF, border: `1px solid ${BORD}`, borderRadius: 12, padding: '18px 18px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: 'rgba(79,142,247,0.15)', border: `1px solid rgba(79,142,247,0.25)`, borderRadius: 4, color: BLUE, letterSpacing: '0.04em', flexShrink: 0 }}>{tag}</span>
                </div>
                <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '48px 60px', background: NAVY, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, marginBottom: 10 }}>Get API Access</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginBottom: 10 }}>Ready to integrate?</h2>
          <p style={{ fontSize: 14, color: MUTED, maxWidth: 480, margin: '0 auto 28px' }}>
            Contact us to receive your tenant credentials, set up sandbox access, and talk through your integration architecture.
          </p>
          <a href="mailto:api@explain.global" style={{ display: 'inline-block', padding: '14px 28px', background: `linear-gradient(135deg, ${BLUE}, #2563eb)`, color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 20px rgba(79,142,247,0.3)' }}>
            api@explain.global
          </a>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 60px', borderTop: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'rgba(160,200,255,0.3)' }}>
          <span>© 2026 Explain Global Ltd</span>
          <span><span style={{ color: BLUE, fontWeight: 700 }}>Explain.Global</span> Partner API · v1</span>
        </div>

      </main>
    </div>
  );
}
