using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PasswordManager.API.Models;
using PasswordManager.Core.Entities;
using PasswordManager.Core.Interfaces;
using PasswordManager.Data;
using Microsoft.AspNetCore.Authorization;

namespace PasswordManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VaultController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICryptoService _crypto;
    private readonly IConfiguration _config;

    
    public VaultController(ApplicationDbContext context, ICryptoService crypto, IConfiguration config)
    {
        _context = context;
        _crypto = crypto;
        _config = config;
    }

    private string GenerateJwtToken(int userId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            claims: new[] { new System.Security.Claims.Claim("id", userId.ToString()) },
            expires: DateTime.UtcNow.AddHours(2), // Токен живе 2 години
            signingCredentials: creds
        );

        return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("init")]
    public async Task<IActionResult> InitVault([FromBody] InitVaultRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            return BadRequest("Користувач з таким іменем вже існує.");

        var salt = _crypto.GenerateSalt();
        var key = _crypto.DeriveKey(request.MasterPassword, salt);

        var user = new User
        {
            Username = request.Username,
            Salt = salt,
            MasterPasswordHash = key // Для простоти MVP зберігаємо ключ як перевірочний хеш
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { user.Id, Message = "Сховище успішно створено!" });
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("add")]
    public async Task<IActionResult> AddPassword([FromBody] AddPasswordRequest request)
    {
        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return NotFound("Користувача не знайдено.");

        // Генеруємо ключ з введеного пароля
        var key = _crypto.DeriveKey(request.MasterPassword, user.Salt);

        // Перевіряємо, чи правильний майстер-пароль (чи збігається з хешем у базі)
        if (!key.SequenceEqual(user.MasterPasswordHash))
            return Unauthorized("Неправильний майстер-пароль!");

        // Шифруємо сам пароль від сервісу
        var (cipherText, nonce) = _crypto.Encrypt(request.Password, key);

        var record = new PasswordRecord
        {
            UserId = user.Id,
            Service = request.Service,
            Login = request.Login,
            Ciphertext = cipherText,
            Nonce = nonce
        };

        _context.PasswordRecords.Add(record);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Пароль надійно зашифровано та збережено." });
    }

    [HttpPost("unlock")]
    public async Task<IActionResult> UnlockVault([FromBody] UnlockVaultRequest request)
    {
        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return NotFound("Користувача не знайдено.");

        var key = _crypto.DeriveKey(request.MasterPassword, user.Salt);
        
        if (!key.SequenceEqual(user.MasterPasswordHash))
            return Unauthorized("Неправильний майстер-пароль!");

        // Витягуємо всі зашифровані записи користувача з БД
        var encryptedVault = await _context.PasswordRecords
            .Where(p => p.UserId == user.Id)
            .ToListAsync();

        // ВИКЛИКАЄМО НАШУ ПАРАЛЕЛЬНУ ФУНКЦІЮ РОЗШИФРУВАННЯ!
        var decryptedVault = _crypto.DecryptVaultParallel(encryptedVault, key);

        // Повертаємо React-фронтенду зручний масив даних
        var response = decryptedVault.Select(v => new
        {
            v.Id,
            v.Service,
            v.Login,
            Password = v.DecryptedPassword,
            // Шукаємо оригінальний запис у базі по ID і беремо його статус IsFavorite
            IsFavorite = encryptedVault.First(e => e.Id == v.Id).IsFavorite
        });

        var token = GenerateJwtToken(user.Id);
        return Ok(new { Token = token, Vault = response });
    }

    [Authorize]
    [HttpPut("edit")]
    public async Task<IActionResult> EditPassword([FromBody] EditPasswordRequest request)
    {
        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null) return NotFound("Користувача не знайдено.");

        // Для шифрування НОВОГО пароля нам знову потрібен ключ
        var key = _crypto.DeriveKey(request.MasterPassword, user.Salt);
        if (!key.SequenceEqual(user.MasterPasswordHash))
            return Unauthorized("Неправильний майстер-пароль!");

        // Шукаємо запис, який належить саме цьому користувачу
        var record = await _context.PasswordRecords
            .FirstOrDefaultAsync(r => r.Id == request.RecordId && r.UserId == request.UserId);
            
        if (record == null) return NotFound("Запис не знайдено.");

        // Шифруємо оновлений пароль
        var (cipherText, nonce) = _crypto.Encrypt(request.Password, key);

        // Оновлюємо дані
        record.Service = request.Service;
        record.Login = request.Login;
        record.Ciphertext = cipherText;
        record.Nonce = nonce;

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Запис успішно оновлено." });
    }

    [Authorize]
    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> DeletePassword(int id, [FromQuery] int userId)
    {
        // Шукаємо запис за ID, перевіряючи, чи він належить поточному юзеру
        var record = await _context.PasswordRecords
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

        if (record == null) return NotFound("Запис не знайдено.");

        _context.PasswordRecords.Remove(record);
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Запис видалено." });
    }

    [Authorize]
    [HttpPatch("toggle-favorite/{id}")]
    public async Task<IActionResult> ToggleFavorite(int id, [FromQuery] int userId)
    {
        var record = await _context.PasswordRecords
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
            
        if (record == null) return NotFound("Запис не знайдено.");

        // Перемикаємо статус на протилежний
        record.IsFavorite = !record.IsFavorite; 
        
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Статус обраного оновлено." });
    }
}