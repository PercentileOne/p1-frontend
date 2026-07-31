using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Infrastructure.Anthropic;
using TalkToLearn.Api.Infrastructure.Cosmos;
using TalkToLearn.Api.Infrastructure.Sql;

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
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["AppUrl"] ?? "http://localhost:5173")
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

TalkToLearn.Api.Features.Auth.Register.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.Login.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.SendMagicLink.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.VerifyToken.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.GetSession.Endpoint.Map(app);
TalkToLearn.Api.Features.Auth.Logout.Endpoint.Map(app);

TalkToLearn.Api.Features.Profile.Endpoint.Map(app);

TalkToLearn.Api.Features.Lessons.Generate.Endpoint.Map(app);
TalkToLearn.Api.Features.Lessons.Score.Endpoint.Map(app);
TalkToLearn.Api.Features.Lessons.ExpandConcept.Endpoint.Map(app);
TalkToLearn.Api.Features.Lessons.GoDeeper.Endpoint.Map(app);
TalkToLearn.Api.Features.Lessons.Export.Endpoint.Map(app);
TalkToLearn.Api.Features.Lessons.Export.TestEmailEndpoint.Map(app);

TalkToLearn.Api.Features.Search.RecordSearch.Endpoint.Map(app);

app.Run();

public partial class Program { }
