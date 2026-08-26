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

builder.Services.AddSingleton<CosmosService>();
builder.Services.AddSingleton<BlobStorageService>();
builder.Services.AddSingleton<CvFileStorageService>();
builder.Services.AddSingleton<TtsCacheService>();
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("SqlDb"),
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<PermissionLoader>();
builder.Services.AddSingleton<AnthropicService>();
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
            "http://localhost:5173",
            "http://localhost:5176",
        };
        var origins = configOrigins.Union(knownOrigins).ToArray();
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddHttpClient();
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
Explain.Api.Features.InterviewPreps.Endpoint.Map(app);

Explain.Api.Features.Auth.ForgotPassword.Endpoint.Map(app);
Explain.Api.Features.Auth.ResetPassword.Endpoint.Map(app);

Explain.Api.Features.Organisations.Endpoint.Map(app);
Explain.Api.Features.Organisations.Members.Endpoint.Map(app);

app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

// ── OpenAI proxy — streams OpenAI response to keep the SWA connection alive ───
app.MapPost("/api/ai-proxy", async (HttpRequest req, HttpResponse res, IHttpClientFactory factory, IConfiguration config) =>
{
    var apiKey = config["OpenAI:ApiKey"] ?? throw new InvalidOperationException("OpenAI:ApiKey not configured");
    req.EnableBuffering();
    var body = await new System.IO.StreamReader(req.Body, System.Text.Encoding.UTF8, leaveOpen: true).ReadToEndAsync();
    req.Body.Position = 0;
    var client = factory.CreateClient();
    using var msg = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
    msg.Headers.Add("Authorization", $"Bearer {apiKey}");
    msg.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
    using var resp = await client.SendAsync(msg, HttpCompletionOption.ResponseHeadersRead);
    res.StatusCode = (int)resp.StatusCode;
    res.ContentType = resp.Content.Headers.ContentType?.ToString() ?? "application/json";
    await resp.Content.CopyToAsync(res.Body);
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
