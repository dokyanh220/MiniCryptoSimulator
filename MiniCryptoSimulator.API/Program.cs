using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiniCryptoSimulator.API.Services;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;
using MiniCryptoSimulator.Infrastructure.BackgroundServices;
using MiniCryptoSimulator.Infrastructure.Data;
using MiniCryptoSimulator.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// SQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(secretKey)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/marketHub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.Configure<TradingSettings>(builder.Configuration.GetSection("TradingSettings"));
builder.Services.AddHttpClient<IBinanceService, BinanceService>();
// Removed ITradingService
builder.Services.AddSingleton<IPnLService, PnLService>(); // Pure functions, can be singleton
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddSingleton<IRiskService, RiskService>(); // Singleton since it handles its own scope
builder.Services.AddSingleton<IMarketBroadcaster, MarketBroadcaster>();
builder.Services.AddHostedService<BinanceWebSocketService>();
builder.Services.AddMemoryCache(); 

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "https://linkmnvapon.click",
                "https://minicryptosimulator.pages.dev"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhập Token vào đây. Ví dụ: Bearer eyJhbGciOiJIUzI1..."
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowNextJs");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<MiniCryptoSimulator.API.Hubs.MarketHub>("/marketHub");

app.Run();