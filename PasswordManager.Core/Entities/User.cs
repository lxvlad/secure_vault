namespace PasswordManager.Core.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty; 
    
    // Тут зберігаємо не сам пароль, а хеш від Argon2
    public byte[] MasterPasswordHash { get; set; } = Array.Empty<byte>(); 
    
    // Сіль генерується один раз при реєстрації і потрібна для KDF
    public byte[] Salt { get; set; } = Array.Empty<byte>(); 
}