using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using PasswordManager.Core.Entities;
using PasswordManager.Core.Interfaces;

namespace PasswordManager.Core.Services;

public class CryptoService : ICryptoService
{
    private const int AesTagSize = 16; // Розмір тегу автентифікації для GCM

    public byte[] GenerateSalt(int length = 16)
    {
        return RandomNumberGenerator.GetBytes(length);
    }

    public byte[] DeriveKey(string masterPassword, byte[] salt)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(masterPassword))
        {
            Salt = salt,
            DegreeOfParallelism = 4, // Кількість потоків для хешування
            Iterations = 2,
            MemorySize = 65536 // 64 MB
        };

        return argon2.GetBytes(32); // 256 біт для AES
    }

    public (byte[] Ciphertext, byte[] Nonce) Encrypt(string plainText, byte[] key)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plainBytes = Encoding.UTF8.GetBytes(plainText);

        // Створюємо єдиний масив для шифру ТА тегу
        var cipherTextWithTag = new byte[plainBytes.Length + AesTagSize];

        using var aes = new AesGcm(key, AesTagSize);
        
        // Використовуємо AsSpan(), щоб безпечно вказати алгоритму, куди саме писати дані
        aes.Encrypt(
            nonce: nonce,
            plaintext: plainBytes,
            ciphertext: cipherTextWithTag.AsSpan(0, plainBytes.Length), // Пишемо шифр на початок
            tag: cipherTextWithTag.AsSpan(plainBytes.Length, AesTagSize) // Пишемо тег у кінець
        );

        return (cipherTextWithTag, nonce);
    }

    public string Decrypt(byte[] cipherText, byte[] nonce, byte[] key)
    {
        var plainBytes = new byte[cipherText.Length - AesTagSize];

        using var aes = new AesGcm(key, AesTagSize);
        // Розділяємо сам шифр і тег
        var actualCipherText = cipherText[..^AesTagSize];
        var tag = cipherText[^AesTagSize..];

        aes.Decrypt(nonce, actualCipherText, tag, plainBytes);

        return Encoding.UTF8.GetString(plainBytes);
    }

    // === ФІЧА ДЛЯ КУРСОВОЇ: ПАРАЛЕЛЬНІ ОБЧИСЛЕННЯ ===
    public List<(int Id, string Service, string Login, string DecryptedPassword)> DecryptVaultParallel(List<PasswordRecord> vault, byte[] key)
    {
        // Використовуємо потокобезпечну колекцію
        var decryptedList = new ConcurrentBag<(int, string, string, string)>();

        // Розкидаємо розшифрування записів по різних ядрах процесора
        Parallel.ForEach(vault, record =>
        {
            try
            {
                var plainPassword = Decrypt(record.Ciphertext, record.Nonce, key);
                decryptedList.Add((record.Id, record.Service, record.Login, plainPassword));
            }
            catch (CryptographicException)
            {
                // Якщо ключ неправильний або дані пошкоджені
                decryptedList.Add((record.Id, record.Service, record.Login, "ERROR: Розшифрування не вдалося"));
            }
        });

        // Повертаємо відсортований за ID список
        return decryptedList.OrderBy(x => x.Item1).ToList();
    }
}