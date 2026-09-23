
import React, { useState } from 'react';
import { 
  Stack, 
  Text, 
  TextField, 
  PrimaryButton, 
  MessageBar, 
  MessageBarType,
  Icon
} from '@fluentui/react';
import { apiService } from '../services/api';

const cardStyles = {
  root: {
    width: 380,
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  }
};

export const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiService.login(username, password);
      // Lưu token và thông tin user
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_info', JSON.stringify(response.user));
      
      onLoginSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack 
      horizontalAlign="center" 
      verticalAlign="center" 
      styles={{ root: { height: '100vh', width: '100vw', backgroundColor: '#f3f2f1' } }}
    >
      <Stack styles={cardStyles} tokens={{ childrenGap: 16 }}>
        {/* Header Logo */}
        <Stack horizontal verticalAlign="center" horizontalAlign="center" tokens={{ childrenGap: 8 }}>
          <Icon iconName="OutlookLogo" styles={{ root: { fontSize: 32, color: '#0078d4' } }} />
          <Text variant="xLarge" styles={{ root: { fontWeight: 600, color: '#0078d4' } }}>
            Outlook Web
          </Text>
        </Stack>

        <Text variant="medium" align="center" styles={{ root: { color: '#605e5c' } }}>
          Đăng nhập hệ thống quản lý
        </Text>

        {error && (
          <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
            {error}
          </MessageBar>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Stack tokens={{ childrenGap: 12 }}>
            <TextField 
              label="Tài khoản" 
              value={username} 
              onChange={(_, val) => setUsername(val || '')}
              required
            />
            <TextField 
              label="Mật khẩu" 
              type="password" 
              canRevealPassword
              value={password} 
              onChange={(_, val) => setPassword(val || '')}
              required
            />

            <PrimaryButton 
              type="submit" 
              text={loading ? "Đang đăng nhập..." : "Đăng nhập"} 
              disabled={loading}
              styles={{ root: { marginTop: 8, height: 36 } }}
            />
          </Stack>
        </form>

        {/* Dummy Account Helper */}
        <Stack styles={{ root: { backgroundColor: '#faf9f8', padding: 12, borderRadius: 4, marginTop: 8 } }}>
          <Text variant="small" styles={{ root: { fontWeight: 600, color: '#323130' } }}>Tài khoản Mockup dùng thử:</Text>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>User: <b>admin</b> | Pass: <b>123</b></Text>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>User: <b>user</b> | Pass: <b>123</b></Text>
        </Stack>
      </Stack>
    </Stack>
  );
};