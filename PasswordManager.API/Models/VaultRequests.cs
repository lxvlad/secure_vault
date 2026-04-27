namespace PasswordManager.API.Models;

// Запит на створення сховища
public record InitVaultRequest(string Username, string MasterPassword);

// Запит на додавання нового пароля
public record AddPasswordRequest(int UserId, string MasterPassword, string Service, string Login, string Password);

// Запит на редагування існуючого пароля
public record EditPasswordRequest(int UserId, string MasterPassword, int RecordId, string Service, string Login, string Password);

// Запит на отримання (розшифрування) всього сховища
// Важливо: ми використовуємо POST для отримання даних, бо передавати пароль у GET-запиті (в URL) - це дірка в безпеці!
public record UnlockVaultRequest(int UserId, string MasterPassword);

