import { useState } from 'react';
import axios from 'axios';
import { Container, Card, CardContent, Typography, TextField, Button, Box, AppBar, Toolbar, Paper, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

// ВКАЖИ ТУТ ПОРТ СВОГО C# СЕРВЕРА (замість 5000)
const API_URL = 'http://localhost:5072/api/Vault';

export default function App() {
  // Стан авторизації (Зберігаємо в оперативній пам'яті за принципом Zero-Knowledge)
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionPassword, setSessionPassword] = useState('');
  
  // Стан для форми входу
  const [username, setUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Стан для сховища (паролі)
  const [vault, setVault] = useState<any[]>([]);
  
  // Стан для форми додавання нового пароля
  const [newService, setNewService] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 1. Реєстрація (Створення сховища)
  const handleInitVault = async () => {
    try {
      const res = await axios.post(`${API_URL}/init`, { username, masterPassword });
      alert(res.data.message);
      setUserId(res.data.id);
      setSessionPassword(masterPassword);
    } catch (error: any) {
      alert(error.response?.data || "Помилка створення сховища");
    }
  };

  // 2. Вхід (Розшифрування сховища)
  const handleUnlock = async () => {
    try {
      // Оскільки у нас MVP, ми використовуємо ID = 1 (перший створений користувач)
      // В ідеалі бекенд мав би шукати по username, але для тесту підійде хардкод ID 1
      const currentUserId = 1; 
      
      const res = await axios.post(`${API_URL}/unlock`, { userId: currentUserId, masterPassword });
      setVault(res.data);
      setUserId(currentUserId);
      setSessionPassword(masterPassword);
    } catch (error) {
      alert("Неправильний майстер-пароль або користувача не існує!");
    }
  };

  // 3. Додавання нового пароля
  const handleAddPassword = async () => {
    try {
      await axios.post(`${API_URL}/add`, {
        userId,
        masterPassword: sessionPassword,
        service: newService,
        login: newLogin,
        password: newPassword
      });
      
      alert("Пароль збережено!");
      // Очищаємо форму
      setNewService(''); setNewLogin(''); setNewPassword('');
      
      // Оновлюємо список
      const res = await axios.post(`${API_URL}/unlock`, { userId, masterPassword: sessionPassword });
      setVault(res.data);
    } catch (error) {
      alert("Помилка додавання пароля");
    }
  };

  // === ЕКРАН АВТОРИЗАЦІЇ ===
  if (!userId) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Card elevation={4}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h4" align="center" fontWeight="bold" gutterBottom>
              Secure Vault
            </Typography>
            
            <TextField 
              label="Логін (Username)" 
              variant="outlined" 
              fullWidth 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
            
            <TextField 
              label="Майстер-пароль" 
              type={showPassword ? 'text' : 'password'} 
              variant="outlined" 
              fullWidth 
              value={masterPassword} 
              onChange={(e) => setMasterPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="contained" color="primary" fullWidth onClick={handleUnlock}>
                Увійти
              </Button>
              <Button variant="outlined" color="secondary" fullWidth onClick={handleInitVault}>
                Створити сховище
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // === ЕКРАН ДАШБОРДУ (Коли увійшли) ===
  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Мій Менеджер Паролів (Користувач ID: {userId})
          </Typography>
          <Button color="inherit" onClick={() => { setUserId(null); setVault([]); setSessionPassword(''); }}>
            Вийти
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Форма додавання */}
        <Paper elevation={2} sx={{ p: 3, mb: 4, display: 'flex', gap: 2 }}>
          <TextField label="Сервіс (напр. GitHub)" size="small" fullWidth value={newService} onChange={e => setNewService(e.target.value)} />
          <TextField label="Логін" size="small" fullWidth value={newLogin} onChange={e => setNewLogin(e.target.value)} />
          <TextField label="Пароль" size="small" fullWidth type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <Button variant="contained" onClick={handleAddPassword} sx={{ minWidth: '120px' }}>Додати</Button>
        </Paper>

        {/* Список паролів */}
        <Typography variant="h5" mb={2}>Збережені записи ({vault.length})</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {vault.map((record) => (
            <Card key={record.id} elevation={1}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">{record.service}</Typography>
                  <Typography variant="body2" color="text.secondary">Логін: {record.login}</Typography>
                </Box>
                <Box sx={{ bgcolor: '#e0f7fa', p: 1, borderRadius: 1 }}>
                  <Typography variant="body1" fontFamily="monospace">{record.password}</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}