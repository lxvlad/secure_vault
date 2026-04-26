using PasswordManager.Core.Entities;

namespace PasswordManager.Core.Interfaces;

public interface ICryptoService
{
    // Генерація випадкової солі
    byte[] GenerateSalt(int length = 16);
    
    // Перетворення пароля на ключ (KDF - Argon2id)
    byte[] DeriveKey(string masterPassword, byte[] salt);
    
    // Шифрування одного запису (AES-256-GCM)
    (byte[] Ciphertext, byte[] Nonce) Encrypt(string plainText, byte[] key);
    
    // Розшифрування одного запису
    string Decrypt(byte[] cipherText, byte[] nonce, byte[] key);
    
    // ПАРАЛЕЛЬНЕ розшифрування всього сховища
    List<(int Id, string Service, string Login, string DecryptedPassword)> DecryptVaultParallel(List<PasswordRecord> vault, byte[] key);
}