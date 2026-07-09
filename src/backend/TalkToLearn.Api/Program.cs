using TalkToLearn.Api.Common;
using TalkToLearn.Api.Infrastructure.Anthropic;
using TalkToLearn.Api.Infrastructure.Cosmos;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddSingleton<CosmosService>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<AnthropicService>();
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["AppUrl"] ?? "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();  // required for session cookies
    });
});

builder.Services.AddOpenApi();

// ── App ───────────────────────────────────────────────────────────────────────

var app = builder.Build();

// Ensure Cosmos DB database and containers exist before accepting requests
await app.Services.GetRequiredService<CosmosService>().InitialiseAsync();

app.UseCors("frontend");

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// ── Routes — one line per vertical slice ─────────────────────────────────────

TalkToLearn.Api.Features.Auth.Register.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.Login.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.SendMagicLink.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.VerifyToken.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.GetSession.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.Logout.Endpoint.Map(app);

TalkToLearn.Api.Features.Lessons.Generate.Endpoint.Map(app);
TalkToLearn.Api.Features.Lessons.ExpandConcept.Endpoint.Map(app);

app.Run();

public partial class Program { }
