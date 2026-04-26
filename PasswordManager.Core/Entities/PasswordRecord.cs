namespace PasswordManager.Core.Entities;

public class PasswordRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    // Ці дані можна зберігати відкрито для пошуку
    public string Service { get; set; } = string.Empty; 
    public string Login { get; set; } = string.Empty;   
    
    // Сам пароль та нотатки будуть зашифровані AES-GCM
    public byte[] Ciphertext { get; set; } = Array.Empty<byte>(); 
    
    // Вектор ініціалізації (Nonce), унікальний для кожного шифрування
    public byte[] Nonce { get; set; } = Array.Empty<byte>(); 
}