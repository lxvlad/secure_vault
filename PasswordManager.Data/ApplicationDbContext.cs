using Microsoft.EntityFrameworkCore;
using PasswordManager.Core.Entities;

namespace PasswordManager.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // Таблиці в нашій базі даних
    public DbSet<User> Users { get; set; }
    public DbSet<PasswordRecord> PasswordRecords { get; set; }
}