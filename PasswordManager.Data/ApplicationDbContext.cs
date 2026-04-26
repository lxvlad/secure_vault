using Microsoft.EntityFrameworkCore;
using PasswordManager.Core.Entities; // Підключаємо наші моделі з іншого проєкту

namespace PasswordManager.Data; // Обов'язково вказуємо простір імен

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // Таблиці в нашій базі даних
    public DbSet<User> Users { get; set; }
    public DbSet<PasswordRecord> PasswordRecords { get; set; }
}