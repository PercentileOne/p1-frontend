using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Anthropic;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Storage;

var builder = WebApplication.CreateBuilder(args);

// Default request-body limits (Kestrel ~28.6MB out-of-process, IIS in-process form
// parsing 128MB) are well below what a full interview screen+audio recording produces —
// see web.config for the matching IIS-level requestLimits raise, which is the one that
// actually binds under in-process hosting. These two are defense-in-depth for the ASP.NET
// Core layer itself (Kestrel if hosting model ever changes, and the multipart form parser
// either way).
const long MaxUploadBytes = 500L * 1024 * 1024;
builder.WebHost.ConfigureKestrel(o => { o.Limits.MaxRequestBodySize = MaxUploadBytes; });
builder.Services.Configure<FormOptions>(o => { o.MultipartBodyLengthLimit = MaxUploadBytes; });

// ── Services ──────────────────────────────────────────────────────────────────

// The App Service already had APPLICATIONINSIGHTS_CONNECTION_STRING and the
// ApplicationInsightsAgent_EXTENSION_VERSION "codeless" auto-instrumentation setting
// configured — but that approach is unreliable for .NET Core apps (Microsoft's own
// recommendation is the SDK below instead), and confirmed live 2026-09-04 it was producing
// zero telemetry despite both settings being present. AddApplicationInsightsTelemetry()
// picks up the connection string from that same env var automatically — no extra config.
builder.Services.AddApplicationInsightsTelemetry();

builder.Services.AddSingleton<CosmosService>();
builder.Services.AddSingleton<BlobStorageService>();
builder.Services.AddSingleton<CvFileStorageService>();
builder.Services.AddSingleton<ProfileImageStorageService>();
builder.Services.AddSingleton<TtsCacheService>();
builder.Services.AddSingleton<Explain.Api.Infrastructure.Storage.NameGreetingVideoStorageService>();
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("SqlDb"),
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<PermissionLoader>();
builder.Services.AddSingleton<AnthropicService>();
builder.Services.AddSingleton<Explain.Api.Features.NameGreetings.DidGenerationService>();
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

// JWT bearer auth — used by /profile and any future protected endpoints
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        // Without this, ASP.NET remaps short claim names ("sub", "email", "role") to legacy
        // XML-namespace URIs on the way in, so every ctx.User.FindFirst("sub") lookup in the
        // app returns null even for a validly-authenticated request.
        opt.MapInboundClaims = false;
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)),
            ValidateIssuer   = false,
            ValidateAudience = false,
            NameClaimType    = "sub",
        };
    });
builder.Services.AddPermissionPolicies();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        var raw = builder.Configuration["AppUrl"] ?? "";
        var configOrigins = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var knownOrigins = new[]
        {
            "https://candidate.interviewme.global",
            "https://recruiter.interviewme.global",
            "https://employer.interviewme.global",
            "https://explain.global",
            "https://www.explain.global",
            "https://candidate.explain.global",
            "https://recruiter.explain.global",
            "https://interviewme.global",
            "https://www.interviewme.global", // the actual working neutral gate domain (interviewme.global apex only redirects via GoDaddy, never serves real content)
            "https://admin.interviewme.global",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5176",
            "http://localhost:5180",
            "http://localhost:5181",
        };
        var origins = configOrigins.Union(knownOrigins).ToArray();
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddHttpClient();
// Named client for D-ID's talking-head video API — invoked from a background task outside
// a request scope (Name Bank auto-generation), so it wants its own explicit, generous timeout
// rather than a per-request default.
builder.Services.AddHttpClient("DID", c =>
{
    c.BaseAddress = new Uri("https://api.d-id.com");
    c.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddHttpClient("AzureMaps", c =>
{
    c.BaseAddress = new Uri("https://atlas.microsoft.com");
    c.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddSingleton<Explain.Api.Infrastructure.Geo.AzureMapsGeocodingService>();
builder.Services.AddOpenApi();

// ── App ───────────────────────────────────────────────────────────────────────

var app = builder.Build();

// Ensure Cosmos DB database and containers exist before accepting requests
await app.Services.GetRequiredService<CosmosService>().InitialiseAsync();
try
{
    await app.Services.GetRequiredService<BlobStorageService>().InitialiseAsync();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Blob storage initialisation failed — interview recordings won't upload, but everything else is unaffected.");
}
try
{
    await app.Services.GetRequiredService<CvFileStorageService>().InitialiseAsync();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "CV file storage initialisation failed — interview prep CV uploads won't attach a viewable file, but extracted text and everything else is unaffected.");
}
try
{
    await app.Services.GetRequiredService<ProfileImageStorageService>().InitialiseAsync();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Profile image storage initialisation failed — avatar/banner uploads will fail, but profile text fields are unaffected.");
}

try
{
    await app.Services.GetRequiredService<Explain.Api.Infrastructure.Storage.NameGreetingVideoStorageService>().InitialiseAsync();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "Name Bank video storage initialisation failed — auto-generated clips won't be re-hosted (D-ID's own URL would be used instead, which expires within 24h).");
}
try
{
    await app.Services.GetRequiredService<TtsCacheService>().InitialiseAsync();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogWarning(ex, "TTS cache initialisation failed — Read Aloud will regenerate audio every time instead of serving cached clips.");
}

// Apply any pending EF migrations automatically on startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Database migration failed on startup — the database may be paused. Will retry on next request.");
    }
}

app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// ── Routes — one line per vertical slice ─────────────────────────────────────

Explain.Api.Features.Auth.Register.Endpoint.Map(app);
Explain.Api.Features.Auth.Login.Endpoint.Map(app);
Explain.Api.Features.Auth.SendMagicLink.Endpoint.Map(app);
Explain.Api.Features.Auth.VerifyToken.Endpoint.Map(app);
Explain.Api.Features.Auth.GetSession.Endpoint.Map(app);
Explain.Api.Features.Auth.Logout.Endpoint.Map(app);

Explain.Api.Features.Profile.Endpoint.Map(app);

Explain.Api.Features.Lessons.Generate.Endpoint.Map(app);
Explain.Api.Features.Lessons.Score.Endpoint.Map(app);
Explain.Api.Features.Lessons.ExpandConcept.Endpoint.Map(app);
Explain.Api.Features.Lessons.GoDeeper.Endpoint.Map(app);
Explain.Api.Features.Lessons.ReadAloud.Endpoint.Map(app);
Explain.Api.Features.Lessons.Export.Endpoint.Map(app);
Explain.Api.Features.Lessons.Export.TestEmailEndpoint.Map(app);

Explain.Api.Features.Search.RecordSearch.Endpoint.Map(app);
Explain.Api.Features.Contact.Endpoint.Map(app);

Explain.Api.Features.Feedback.Submit.Endpoint.Map(app);
Explain.Api.Features.Feedback.List.Endpoint.Map(app);

Explain.Api.Features.Courses.Endpoint.Map(app);

Explain.Api.Features.Interviews.Endpoint.Map(app);
Explain.Api.Features.Interviews.Admin.Endpoint.Map(app);
Explain.Api.Features.InterviewPreps.Endpoint.Map(app);
Explain.Api.Features.Introductions.Endpoint.Map(app);
Explain.Api.Features.Alerts.Endpoint.Map(app);

Explain.Api.Features.Auth.ForgotPassword.Endpoint.Map(app);
Explain.Api.Features.Auth.ResetPassword.Endpoint.Map(app);

Explain.Api.Features.Organisations.Endpoint.Map(app);
Explain.Api.Features.Organisations.Members.Endpoint.Map(app);
Explain.Api.Features.Careers.Admin.Endpoint.Map(app);
Explain.Api.Features.Users.List.Endpoint.Map(app);
Explain.Api.Features.Users.Create.Endpoint.Map(app);

Explain.Api.Features.Reactions.Endpoint.Map(app);
Explain.Api.Features.Comments.Endpoint.Map(app);
Explain.Api.Features.Profile.Block.Endpoint.Map(app);
Explain.Api.Features.Comments.Admin.Endpoint.Map(app);
Explain.Api.Features.CandidateSearch.Endpoint.Map(app);
Explain.Api.Features.NameGreetings.Endpoint.Map(app);
Explain.Api.Features.NameGreetings.Admin.Endpoint.Map(app);
Explain.Api.Features.PlatformSettings.Endpoint.Map(app);

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

// ── AI proxy — Azure AI Foundry Model Router, streams the response to keep the SWA
// connection alive. Was a direct pass-through to OpenAI; now routes across 20+ models
// from OpenAI/Anthropic/DeepSeek/Meta/xAI with automatic failover if one is unavailable —
// see docs/specs/multi-model-strategy.html for why. Every caller (aiScoring.ts across all
// portals) still sends a hardcoded "gpt-4o-mini" in the request body; that's rewritten to
// the router's deployment name below so nothing upstream needed to change.
app.MapPost("/api/ai-proxy", async (HttpRequest req, HttpResponse res, IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
{
    var apiKey = config["ModelRouter:ApiKey"] ?? throw new InvalidOperationException("ModelRouter:ApiKey not configured");
    var endpoint = config["ModelRouter:Endpoint"] ?? throw new InvalidOperationException("ModelRouter:Endpoint not configured");
    req.EnableBuffering();
    var body = await new System.IO.StreamReader(req.Body, System.Text.Encoding.UTF8, leaveOpen: true).ReadToEndAsync();
    req.Body.Position = 0;

    string forwardBody;
    try
    {
        var node = System.Text.Json.Nodes.JsonNode.Parse(body)!.AsObject();
        node["model"] = "model-router";
        forwardBody = node.ToJsonString();
    }
    catch (System.Text.Json.JsonException)
    {
        forwardBody = body; // malformed body — let the provider's own error surface rather than masking it
    }

    // Everything from here on used to have zero exception handling: a transient failure
    // reaching the Model Router (timeout, DNS blip, connection reset) threw an unhandled
    // exception that bypassed the CORS middleware entirely, so the browser saw a bare 500
    // with no Access-Control-Allow-Origin header and reported it as "blocked by CORS policy"
    // — a genuine downstream failure masquerading as a CORS misconfiguration, confirmed live
    // 2026-09-04 (intermittent: back-to-back identical requests got 500, then 200). Wrapping
    // this in try/catch means a real failure still surfaces as a real, CORS-header-intact
    // error the frontend's own retry logic can actually see and act on, instead of a
    // misleading network-level failure with no status code at all.
    try
    {
        var client = factory.CreateClient();
        using var msg = new HttpRequestMessage(HttpMethod.Post, $"{endpoint.TrimEnd('/')}/openai/v1/chat/completions");
        msg.Headers.Add("api-key", apiKey);
        msg.Content = new StringContent(forwardBody, System.Text.Encoding.UTF8, "application/json");
        using var resp = await client.SendAsync(msg, HttpCompletionOption.ResponseHeadersRead);
        res.StatusCode = (int)resp.StatusCode;
        res.ContentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
        await resp.Content.CopyToAsync(res.Body);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "ai-proxy: Model Router call failed");
        res.StatusCode = StatusCodes.Status502BadGateway;
        res.ContentType = "application/json";
        await res.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new { error = "Model Router request failed", detail = ex.Message }));
    }
}).AllowAnonymous();

// ── Whisper transcription proxy — raw audio body in, { text } out ─────────────
app.MapPost("/api/ai/transcribe", async (HttpRequest req, HttpResponse res, IHttpClientFactory factory, IConfiguration config) =>
{
    var apiKey = config["OpenAI:ApiKey"] ?? throw new InvalidOperationException("OpenAI:ApiKey not configured");
    var language = req.Query["language"].ToString();
    if (string.IsNullOrWhiteSpace(language)) language = "en";

    var contentType = req.ContentType ?? "audio/webm";
    var ext = contentType.Contains("ogg") ? "ogg" : contentType.Contains("mp4") ? "mp4" : "webm";

    using var ms = new System.IO.MemoryStream();
    await req.Body.CopyToAsync(ms);
    ms.Position = 0;

    using var content = new MultipartFormDataContent();
    var audioContent = new StreamContent(ms);
    // MediaTypeHeaderValue rejects a full browser Content-Type like "audio/webm;codecs=opus" —
    // its constructor only accepts a bare "type/subtype", no parameters. Use a clean one derived
    // from the detected extension instead of re-parsing the raw request header.
    audioContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue($"audio/{ext}");
    content.Add(audioContent, "file", $"recording.{ext}");
    content.Add(new StringContent("whisper-1"), "model");
    content.Add(new StringContent(language), "language");

    var client = factory.CreateClient();
    using var msg = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/audio/transcriptions");
    msg.Headers.Add("Authorization", $"Bearer {apiKey}");
    msg.Content = content;
    using var resp = await client.SendAsync(msg);
    res.StatusCode = (int)resp.StatusCode;
    res.ContentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
    await resp.Content.CopyToAsync(res.Body);
}).AllowAnonymous();

app.Run();

public partial class Program { }
