import { useState } from 'react';
import axios from 'axios';
import { Container, Card, CardContent, Typography, TextField, Button, Box, AppBar, Toolbar, Paper, IconButton, InputAdornment, LinearProgress } from '@mui/material';
import { Visibility, VisibilityOff, Delete, Edit, Search, Star, StarBorder } from '@mui/icons-material';

const API_URL = 'http://localhost:5072/api/Vault';

export default function App() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionPassword, setSessionPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  
  const [username, setUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [vault, setVault] = useState<any[]>([]);
  const [newService, setNewService] = useState('');
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSavePassword = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingRecordId) {
        await axios.put(`${API_URL}/edit`, {
          userId, masterPassword: sessionPassword, recordId: editingRecordId, service: newService, login: newLogin, password: newPassword
        }, config);
      } else {
        await axios.post(`${API_URL}/add`, {
          userId, masterPassword: sessionPassword, service: newService, login: newLogin, password: newPassword
        }, config);
      }
      resetForm();
      await fetchVault();
    } catch (error) {
      alert("Помилка збереження.");
    }
  };

  const handleDelete = async (recordId: number) => {
    if (!window.confirm("Видалити цей пароль?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/delete/${recordId}?userId=${userId}`, config);
      await fetchVault(); 
    } catch (error) {
      alert("Помилка видалення.");
    }
  };

  // --- НОВА ФУНКЦІЯ: ПЕРЕМИКАЧ ОБРАНОГО ---
  const handleToggleFavorite = async (recordId: number) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.patch(`${API_URL}/toggle-favorite/${recordId}?userId=${userId}`, {}, config);
      await fetchVault(); // Оновлюємо список, щоб побачити зміни
    } catch (error) {
      alert("Помилка оновлення статусу.");
    }
  };

  const startEdit = (record: any) => {
    setEditingRecordId(record.id);
    setNewService(record.service);
    setNewLogin(record.login);
    setNewPassword(record.password);
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setNewService('');
    setNewLogin('');
    setNewPassword('');
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = Array.from({length: 16}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setNewPassword(generated);
  };

  const handleSecureCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Скопійовано! Буфер очиститься через 30с.");
    setTimeout(() => navigator.clipboard.writeText(""), 30000);
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strengthScore = getPasswordStrength(newPassword);
  const strengthColor = strengthScore <= 25 ? 'error' : strengthScore <= 50 ? 'warning' : strengthScore <= 75 ? 'info' : 'success';

  // --- НОВА ЛОГІКА: ФІЛЬТРАЦІЯ ТА СОРТУВАННЯ (ОБРАНІ ЗВЕРХУ) ---
  const filteredAndSortedVault = vault
    .filter(record => 
      record.service.toLowerCase().includes(searchQuery.toLowerCase()) || 
      record.login.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Якщо a - обране, а b - ні, то a піднімається вище (-1)
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

  if (!userId) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Card elevation={4}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h4" align="center" sx={{ fontWeight: 'bold' }} gutterBottom>Secure Vault</Typography>
            <TextField label="Логін" variant="outlined" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField 
              label="Майстер-пароль" type={showPassword ? 'text' : 'password'} 
              variant="outlined" fullWidth value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)}
              slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>)}}}
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
          <Button color="inherit" onClick={() => { setUserId(null); setVault([]); setSessionPassword(''); setToken(null); setSearchQuery(''); }}>Вийти</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField label="Сервіс" size="small" fullWidth value={newService} onChange={e => setNewService(e.target.value)} />
            <TextField label="Логін" size="small" fullWidth value={newLogin} onChange={e => setNewLogin(e.target.value)} />
            <Box sx={{ width: '100%' }}>
              <TextField label="Пароль" size="small" fullWidth type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              {newPassword && <LinearProgress variant="determinate" value={strengthScore} color={strengthColor} sx={{ mt: 1, height: 6, borderRadius: 1 }} />}
            </Box>
            <Button variant="outlined" onClick={handleGeneratePassword} sx={{ minWidth: '40px', px: 1, height: '40px' }} title="Згенерувати">🎲</Button>
            <Button variant="contained" color={editingRecordId ? "success" : "primary"} onClick={handleSavePassword} sx={{ minWidth: '120px', height: '40px' }}>
              {editingRecordId ? "Оновити" : "Додати"}
            </Button>
            {editingRecordId && <Button variant="text" color="error" onClick={resetForm}>Скасувати</Button>}
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Збережені записи ({filteredAndSortedVault.length})</Typography>
          <TextField 
            size="small" placeholder="Пошук..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: { startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) } }}
            sx={{ bgcolor: 'white', borderRadius: 1, width: '250px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredAndSortedVault.map((record) => (
            <Card key={record.id} elevation={1} sx={{ borderLeft: record.isFavorite ? '4px solid #ffb300' : 'none' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Кнопка-зірочка для Обраного */}
                  <IconButton 
                    onClick={() => handleToggleFavorite(record.id)} 
                    sx={{ color: record.isFavorite ? '#ffb300' : 'default' }}
                    title={record.isFavorite ? "Прибрати з обраного" : "Додати в обране"}
                  >
                    {record.isFavorite ? <Star /> : <StarBorder />}
                  </IconButton>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{record.service}</Typography>
                    <Typography variant="body2" color="text.secondary">Логін: {record.login}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ bgcolor: '#e0f7fa', p: 1, borderRadius: 1, width: '120px', textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>••••••••</Typography>
                  </Box>
                  <Button size="small" variant="contained" color="secondary" onClick={() => handleSecureCopy(record.password)}>Копіювати</Button>
                  <IconButton color="primary" onClick={() => startEdit(record)} title="Редагувати"><Edit /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(record.id)} title="Видалити"><Delete /></IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
          {filteredAndSortedVault.length === 0 && (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
              Нічого не знайдено 🕵️‍♂️
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}