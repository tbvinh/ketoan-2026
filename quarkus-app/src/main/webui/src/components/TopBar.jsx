
import React, { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  SearchBox, 
  IconButton, 
  Persona, 
  PersonaSize, 
  Callout, 
  ActionButton,
  DirectionalHint,
  Spinner 
} from '@fluentui/react';

import { useLanguage } from '../i18n/LanguageContext';

// Giả định apiService đã có hàm lấy thông tin user hoặc notification
// import { apiService } from '../services/api';

const topBarStyles = {
  root: {
    height: 48,
    backgroundColor: '#0078d4', // Mau xanh mien Fluent/Office 365
    color: '#ffffff',
    padding: '0 12px',
  }
};

const searchBoxStyles = {
  root: {
    width: 380,
    borderRadius: 4,
    height: 32,
    border: 'none'
  }
};

export const TopBar = ({ activeFolder, currentUser, onLogout, showDemoDialog }) => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { lang, switchLanguage, t } = useLanguage();

  // 1. Fetch thong tin user profile tu API (neu co)
  useEffect(() => {
    let isMounted = true;
    setLoadingUser(true);

    // Placeholder: Thay bang apiService.getCurrentUser() khi co backend
    Promise.resolve({ name: 'Anh Vinh', email: 'vinh@company.com' })
      .then(data => { if (isMounted) setUser(data); })
      .catch(err => console.error(err))
      .finally(() => { if (isMounted) setLoadingUser(false); });

    return () => { isMounted = false; };
  }, []);

  // 2. Xu ly submit search global
  const handleSearch = (newValue) => {
    if (!newValue) return;
    showDemoDialog('Tim kiem', `Dang tim kiem cum tu: "${newValue}" trong folder: ${activeFolder}`);
  };

  return (
    <Stack horizontal verticalAlign="center" horizontalAlign="space-between" styles={topBarStyles}>
      
      {/* 1. Left Section: Waffle App Launcher & Logo */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <IconButton
          iconProps={{ iconName: 'WaffleOffice365' }}
          title="App Launcher"
          ariaLabel="App Launcher"
          styles={{
            root: { color: '#ffffff' },
            rootHovered: { backgroundColor: '#005a9e', color: '#ffffff' }
          }}
          onClick={() => showDemoDialog('App Launcher', 'Danh sach ung dung Microsoft 365')}
        />
        <Text variant="large" styles={{ root: { fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap' } }}>
          Outlook
        </Text>
      </Stack>

      {/* 2. Middle Section: Global Search Box */}
      <Stack horizontal verticalAlign="center" styles={{ root: { flex: 1, padding: '0 20px' } }} horizontalAlign="center">
        <SearchBox
          placeholder={`Tim kiếm trong ${activeFolder ? activeFolder.replace('_', ' ') : 'thu muc'}...`}
          styles={searchBoxStyles}
          value={searchQuery}
          onChange={(_, newValue) => setSearchQuery(newValue || '')}
          onSearch={handleSearch}
        />
      </Stack>

      {/* 3. Right Section: Quick Action Icons & Profile */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
        <IconButton
          iconProps={{ iconName: 'MeetNow' }}
          title="Cuoc hop moi"
          styles={{
            root: { color: '#ffffff' },
            rootHovered: { backgroundColor: '#005a9e', color: '#ffffff' }
          }}
          onClick={() => showDemoDialog('Meet Now', 'Tao cuoc hop nhanh')}
        />
        <IconButton
          iconProps={{ iconName: 'Ringer' }}
          title="Thong bao"
          styles={{
            root: { color: '#ffffff' },
            rootHovered: { backgroundColor: '#005a9e', color: '#ffffff' }
          }}
          onClick={() => showDemoDialog('Thong bao', 'Khong co thong bao moi')}
        />
        <IconButton
          iconProps={{ iconName: 'Settings' }}
          title="Cai dat"
          styles={{
            root: { color: '#ffffff' },
            rootHovered: { backgroundColor: '#005a9e', color: '#ffffff' }
          }}
          onClick={() => showDemoDialog('Cai dat', 'Mo bang cai dat he thong')}
        />

    <ActionButton
      styles={{ root: { color: '#ffffff', fontWeight: 600 } }}
      onClick={() => switchLanguage(lang === 'vi' ? 'en' : 'vi')}
    >
      {lang.toUpperCase()} 🌐
    </ActionButton>

        {/* User Profile Area */}
        <div id="user-profile-target" style={{ marginLeft: 8, cursor: 'pointer' }}>
          {loadingUser ? (
            <Spinner size={1} />
          ) : (
            <Persona
              text={user?.name || 'User'}
              size={PersonaSize.size32}
              hidePersonaDetails={true}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            />
          )}
        </div>

        {/* Callout hiển thị chi tiết User Profile khi click */}
        {isProfileOpen && (
          <Callout
            target="#user-profile-target"
            onDismiss={() => setIsProfileOpen(false)}
            directionalHint={DirectionalHint.bottomRightEdge}
            setInitialFocus
          >
            <Stack tokens={{ padding: 16, childrenGap: 12 }} styles={{ root: { width: 240 } }}>
                <Persona
                  text={currentUser?.name || 'User'}
                  secondaryText={currentUser?.email || ''}
                  size={PersonaSize.size48}
                />
                <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 8 }}>
                  <IconButton
                    iconProps={{ iconName: 'SignOut' }}
                    title="Đăng xuất"
                    onClick={onLogout} // Nút đăng xuất thật
                  />
                </Stack>
              </Stack>
          </Callout>
        )}
      </Stack>

    </Stack>
  );
};