import { useState } from 'react';
import axios from 'axios';
import { Container, Card, CardContent, Typography, TextField, Button, Box, AppBar, Toolbar, Paper, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff, Delete, Edit } from '@mui/icons-material';

const API_URL = 'http://localhost:5072/api/Vault';

export default function App() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionPassword, setSessionPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  
  const [username, setUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [vault, setVault] = useState<any[]>([]);
  
  // Стани форми
  const [newService, setNewService] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Стан для редагування (якщо null - це режим додавання, якщо число - режим редагування)
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  // === АВТОРИЗАЦІЯ ===
  const handleInitVault = async () => {
    try {
      const res = await axios.post(`${API_URL}/init`, { username, masterPassword });
      alert(`${res.data.message} Тепер натисніть 'Увійти'.`);
    } catch (error: any) {
      alert(error.response?.data || "Помилка створення сховища");
    }
  };

  const handleUnlock = async () => {
    try {
      const currentUserId = 1; 
      const res = await axios.post(`${API_URL}/unlock`, { userId: currentUserId, masterPassword });
      setVault(res.data.vault);
      setToken(res.data.token);
      setUserId(currentUserId);
      setSessionPassword(masterPassword);
    } catch (error) {
      alert("Неправильний майстер-пароль або користувача не існує!");
    }
  };

  const fetchVault = async () => {
    const res = await axios.post(`${API_URL}/unlock`, { userId, masterPassword: sessionPassword });
    setVault(res.data.vault);
  };

  // === ЗБЕРЕЖЕННЯ (Додавання або Редагування) ===
  const handleSavePassword = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingRecordId) {
        // Режим РЕДАГУВАННЯ
        await axios.put(`${API_URL}/edit`, {
          userId,
          masterPassword: sessionPassword,
          recordId: editingRecordId,
          service: newService,
          login: newLogin,
          password: newPassword
        }, config);
        alert("Запис оновлено!");
      } else {
        // Режим ДОДАВАННЯ
        await axios.post(`${API_URL}/add`, {
          userId,
          masterPassword: sessionPassword,
          service: newService,
          login: newLogin,
          password: newPassword
        }, config);
        alert("Пароль збережено!");
      }
      
      resetForm();
      await fetchVault();
    } catch (error) {
      alert("Помилка збереження (Можливо, термін дії токена минув)");
    }
  };

  // === ВИДАЛЕННЯ ===
  const handleDelete = async (recordId: number) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей пароль?")) return;
    
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/delete/${recordId}?userId=${userId}`, config);
      await fetchVault(); // Оновлюємо список після видалення
    } catch (error) {
      alert("Помилка видалення.");
    }
  };

  // === ПІДГОТОВКА ДО РЕДАГУВАННЯ ===
  const startEdit = (record: any) => {
    setEditingRecordId(record.id);
    setNewService(record.service);
    setNewLogin(record.login);
    setNewPassword(record.password); // Вставляємо розшифрований пароль у поле
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setNewService('');
    setNewLogin('');
    setNewPassword('');
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 16; i++) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewPassword(generated);
  };

  const handleSecureCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Скопійовано! Буфер обміну буде автоматично очищено через 30 секунд.");
    setTimeout(() => navigator.clipboard.writeText(""), 30000);
  };

  if (!userId) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Card elevation={4}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h4" align="center" sx={{ fontWeight: 'bold' }} gutterBottom>
              Secure Vault
            </Typography>
            <TextField label="Логін" variant="outlined" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField 
              label="Майстер-пароль" type={showPassword ? 'text' : 'password'} 
              variant="outlined" fullWidth value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)}
              slotProps={{ input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="contained" color="primary" fullWidth onClick={handleUnlock}>Увійти</Button>
              <Button variant="outlined" color="secondary" fullWidth onClick={handleInitVault}>Створити сховище</Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Мій Менеджер Паролів</Typography>
          <Button color="inherit" onClick={() => { setUserId(null); setVault([]); setSessionPassword(''); setToken(null); }}>Вийти</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField label="Сервіс" size="small" fullWidth value={newService} onChange={e => setNewService(e.target.value)} />
          <TextField label="Логін" size="small" fullWidth value={newLogin} onChange={e => setNewLogin(e.target.value)} />
          <TextField label="Пароль" size="small" fullWidth type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          
          <Button variant="outlined" onClick={handleGeneratePassword} sx={{ minWidth: '40px', px: 1 }} title="Згенерувати пароль">🎲</Button>
          
          {/* Динамічна кнопка: Зберегти зміни або Додати новий */}
          <Button variant="contained" color={editingRecordId ? "success" : "primary"} onClick={handleSavePassword} sx={{ minWidth: '120px' }}>
            {editingRecordId ? "Оновити" : "Додати"}
          </Button>
          
          {editingRecordId && (
            <Button variant="text" color="error" onClick={resetForm}>Скасувати</Button>
          )}
        </Paper>

        <Typography variant="h5" sx={{ mb: 2 }}>Збережені записи ({vault.length})</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {vault.map((record) => (
            <Card key={record.id} elevation={1}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{record.service}</Typography>
                  <Typography variant="body2" color="text.secondary">Логін: {record.login}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ bgcolor: '#e0f7fa', p: 1, borderRadius: 1, width: '120px', textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>••••••••</Typography>
                  </Box>
                  <Button size="small" variant="contained" color="secondary" onClick={() => handleSecureCopy(record.password)}>Копіювати</Button>
                  
                  {/* Кнопки Редагувати та Видалити */}
                  <IconButton color="primary" onClick={() => startEdit(record)} title="Редагувати">
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(record.id)} title="Видалити">
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}