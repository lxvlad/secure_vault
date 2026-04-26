using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PasswordManager.API.Models;
using PasswordManager.Core.Entities;
using PasswordManager.Core.Interfaces;
using PasswordManager.Data;

namespace PasswordManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VaultController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ICryptoService _crypto;

    public VaultController(ApplicationDbContext context, ICryptoService crypto)
    {
        _context = context;
        _crypto = crypto;
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
            Password = v.DecryptedPassword
        });

        return Ok(response);
    }
}