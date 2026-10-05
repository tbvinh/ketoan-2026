import React, { useState, useEffect, useCallback } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { Stack, Dialog, DialogType, DialogFooter, PrimaryButton } from '@fluentui/react';

// Components
import { Login } from './components/Login';
import { TopBar } from './components/TopBar';
import { MenuBar } from './components/MenuBar';
import { RibbonToolbar } from './components/RibbonToolbar';
import { MiniSidebar } from './components/MiniSidebar';
import { FolderTree } from './components/FolderTree';
import { ItemList } from './components/ItemList';
import { ItemDetail } from './components/ItemDetail';

import './App.css';

initializeIcons();

const containerStackStyles = { root: { height: '100vh', width: '100vw', overflow: 'hidden' } };
const bodyStackStyles = { root: { height: 'calc(100vh - 114px)', overflow: 'hidden' } };
const sidePaneStackStyles = { root: { width: 220, background: '#faf9f8', borderRight: '1px solid #edebe9', padding: '10px' } };

export default function App() {
  // 0. Quản lý Authentication state
//  const [currentUser, setCurrentUser] = useState(() => {
//    const savedUser = localStorage.getItem('user_info');
//    return savedUser ? JSON.parse(savedUser) : null;
//  });

const [currentUser, setCurrentUser] = useState(() => {
  try {
    const savedUser = localStorage.getItem('user_info');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (e) {
    console.error("Lỗi parse user_info:", e);
    localStorage.removeItem('user_info');
    return null;
  }
});

  const [activeModule, setActiveModule] = useState('mail');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  const [activeMenu, setActiveMenu] = useState('Home');
  const [isTreeBarVisible, setIsTreeBarVisible] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', message: '' });

  // Xu ly Dang xuat
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    setCurrentUser(null);
  };

  // 1. Đồng bộ URL Hash -> State
  const syncFromUrl = useCallback(() => {
    const hash = window.location.hash.replace('#/', '');
    if (!hash) return;
    const [mod, folder, idStr] = hash.split('/');
    if (mod) setActiveModule(mod);
    if (folder) setActiveFolder(folder);
    if (idStr) setSelectedItemId(Number(idStr));
  }, []);

  useEffect(() => {
    if (currentUser) {
      syncFromUrl();
      window.addEventListener('hashchange', syncFromUrl);
      return () => window.removeEventListener('hashchange', syncFromUrl);
    }
  }, [syncFromUrl, currentUser]);

  const navigateTo = (mod, folder, itemId = null) => {
    let hash = `/${mod}/${folder}`;
    if (itemId) hash += `/${itemId}`;
    window.location.hash = hash;
  };

  const handleModuleSelect = (mod) => {
    const defaultFolders = { mail: 'inbox', calendar: 'my_calendar', people: 'all_contacts', todo: 'my_day' };
    const folder = defaultFolders[mod] || 'inbox';
    navigateTo(mod, folder, null);
  };

  const handleFolderSelect = (folder) => navigateTo(activeModule, folder, null);
  const handleItemSelect = (itemId) => navigateTo(activeModule, activeFolder, itemId);

  const showDemoDialog = (title, message) => setDialogConfig({ isOpen: true, title, message });
  const closeDialog = () => setDialogConfig(prev => ({ ...prev, isOpen: false }));

  // Nếu chưa đăng nhập -> Hiển thị trang Login
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Nếu đã đăng nhập -> Hiển thị Dashboard
  return (
    <Stack styles={containerStackStyles}>
      <TopBar 
        activeFolder={activeFolder} 
        currentUser={currentUser}
        onLogout={handleLogout}
        showDemoDialog={showDemoDialog} 
      />
      <MenuBar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        isTreeBarVisible={isTreeBarVisible} 
        toggleTreeBar={() => setIsTreeBarVisible(!isTreeBarVisible)} 
      />
      <RibbonToolbar 
        activeMenu={activeMenu} 
        activeModule={activeModule} 
        showDemoDialog={showDemoDialog} 
        isTreeBarVisible={isTreeBarVisible} 
        toggleTreeBar={() => setIsTreeBarVisible(!isTreeBarVisible)} 
      />

      <Stack horizontal styles={bodyStackStyles}>
        <MiniSidebar activeModule={activeModule} onModuleSelect={handleModuleSelect} />

        {isTreeBarVisible && (
          <Stack styles={sidePaneStackStyles}>
            <FolderTree 
              activeModule={activeModule} 
              activeFolder={activeFolder} 
              onFolderSelect={handleFolderSelect} 
              showDemoDialog={showDemoDialog} 
            />
          </Stack>
        )}

        <Stack horizontal styles={{ root: { flex: 1 } }}>
          <ItemList 
            activeFolder={activeFolder} 
            selectedItemId={selectedItemId} 
            onItemSelect={handleItemSelect} 
          />
          <ItemDetail 
            selectedItemId={selectedItemId} 
            showDemoDialog={showDemoDialog} 
          />
        </Stack>
      </Stack>

      <Dialog 
        hidden={!dialogConfig.isOpen} 
        onDismiss={closeDialog} 
        dialogContentProps={{ type: DialogType.normal, title: dialogConfig.title, subText: dialogConfig.message }}
      >
        <DialogFooter><PrimaryButton onClick={closeDialog} text="OK" /></DialogFooter>
      </Dialog>
    </Stack>
  );
}