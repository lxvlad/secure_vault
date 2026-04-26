using Microsoft.EntityFrameworkCore;
using PasswordManager.Core.Interfaces;
using PasswordManager.Core.Services;
using PasswordManager.Data;
using Scalar.AspNetCore; // Підключаємо новий інтерфейс

var builder = WebApplication.CreateBuilder(args);

// === 1. ПІДКЛЮЧЕННЯ БАЗИ ДАНИХ ===
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// === ДОДАЄМО НАШ КРИПТОСЕРВІС ===
builder.Services.AddScoped<ICryptoService, CryptoService>();

// === 2. РЕЄСТРАЦІЯ СЕРВІСІВ ===
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Використовуємо рідний OpenAPI від .NET 9 замість Swagger
builder.Services.AddOpenApi(); 

// === ДОДАЄМО CORS (щоб React міг робити запити) ===
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Стандартний порт Vite/React
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
// =================================================

var app = builder.Build();

// === 3. НАЛАШТУВАННЯ HTTP-ПАЙПЛАЙНУ ===
if (app.Environment.IsDevelopment())
{
    // Генеруємо специфікацію
    app.MapOpenApi();
    
    // Підключаємо красивий візуальний інтерфейс Scalar (замість SwaggerUI)
    app.MapScalarApiReference(); 
}

// === ВМИКАЄМО CORS ===
app.UseCors("AllowReact"); 
// =====================

app.UseHttpsRedirection();
app.UseAuthorization(); 
app.MapControllers(); 

app.Run();