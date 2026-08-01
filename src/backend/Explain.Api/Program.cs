using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Anthropic;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

builder.Services.AddSingleton<CosmosService>();
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
        var raw = builder.Configuration["AppUrl"] ?? "http://localhost:5173";
        var origins = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

// ── App ───────────────────────────────────────────────────────────────────────

var app = builder.Build();

// Ensure Cosmos DB database and containers exist before accepting requests
await app.Services.GetRequiredService<CosmosService>().InitialiseAsync();

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
Explain.Api.Features.Lessons.Export.Endpoint.Map(app);
Explain.Api.Features.Lessons.Export.TestEmailEndpoint.Map(app);

Explain.Api.Features.Search.RecordSearch.Endpoint.Map(app);

app.Run();

public partial class Program { }
