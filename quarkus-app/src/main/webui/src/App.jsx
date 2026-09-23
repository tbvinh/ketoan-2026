import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { 
  Stack, Text, SearchBox, IconButton, Persona, ActionButton, PrimaryButton, DefaultButton,
  CommandBar, Dialog, DialogType, DialogFooter
} from '@fluentui/react';
import './App.css';

initializeIcons();

// Layout Styles
const containerStackStyles = { root: { height: '100vh', width: '100vw', overflow: 'hidden' } };
const headerStackStyles = { root: { height: 42, background: '#0078d4', color: 'white', padding: '0 10px' } };
const menuBarStackStyles = { root: { height: 32, background: '#f3f2f1', borderBottom: '1px solid #e1dfdd', paddingLeft: '4px' } };
const bodyStackStyles = { root: { height: 'calc(100vh - 114px)', overflow: 'hidden' } };

const miniSidebarStyles = { 
  root: { 
    width: 48, 
    background: '#f3f2f1', 
    borderRight: '1px solid #edebe9', 
    paddingTop: '8px',
    alignItems: 'center'
  } 
};
const sidePaneStackStyles = { 
  root: { 
    width: 220, 
    background: '#faf9f8', 
    borderRight: '1px solid #edebe9', 
    padding: '10px'
  } 
};
const mainContentStackStyles = { root: { flex: 1, padding: '20px', background: 'white', overflowY: 'auto' } };

// Mock Data Store
const folderDataStore = {
  inbox: [
    { id: 1, title: 'Dev Team', subtitle: 'Quarkus Quinoa 2.5 is here!', time: '10:30 AM', body: 'Quarkus Quinoa giúp tích hợp Vite + React đơn giản và tối ưu build production.' },
    { id: 2, title: 'Vite JS', subtitle: 'New plugin release available', time: '9:15 AM', body: 'Đã có bản cập nhật tối ưu HMR cho React applications.' },
    { id: 3, title: 'React Conf', subtitle: 'Register now for early bird', time: 'Yesterday', body: 'Vé tham dự sự kiện React Conf mở bán chính thức từ hôm nay.' },
  ],
  sent: [
    { id: 4, title: 'To: CEO Office', subtitle: 'Báo cáo tiến độ dự án Quarkus', time: '8:00 AM', body: 'Đã hoàn thiện module Web UI với Fluent UI trên nền Quarkus Quinoa.' },
    { id: 5, title: 'To: QA Team', subtitle: 'Yêu cầu test giao diện Outlook', time: 'Yesterday', body: 'Nhờ team test giúp tính năng chuyển đổi Folder Tree và Workspace.' },
  ],
  deleted: [
    { id: 6, title: 'Spam Newsletter', subtitle: 'Khuyến mãi hosting 50%', time: '20 Sep', body: 'Thư này đã bị chuyển vào mục Đã xóa.' },
  ],
  archive: [
    { id: 7, title: 'AWS Cloud', subtitle: 'Monthly Billing Statement', time: '15 Sep', body: 'Hóa đơn tài khoản AWS cho tháng vừa qua.' },
  ],
  my_calendar: [
    { id: 101, title: 'Họp Sprint Planning', subtitle: 'Phòng 302 / Teams', time: '09:00 AM - 10:00 AM', body: 'Thảo luận kế hoạch phát triển ứng dụng Quarkus + React.' },
    { id: 102, title: 'Review Code Module UI', subtitle: 'Online', time: '02:00 PM - 03:00 PM', body: 'Kiểm tra lại Mini Sidebar và Routing giữa các module.' },
  ],
  all_contacts: [
    { id: 201, title: 'Anh Vinh', subtitle: 'vinh@company.com', time: 'Architect', body: 'Vai trò: Software Architect & Backend Expert.' },
    { id: 202, title: 'Trần Bình', subtitle: 'binh@company.com', time: 'Frontend', body: 'Vai trò: ReactJS / UI UX Specialist.' },
  ],
  my_day: [
    { id: 301, title: 'Cập nhật MenuBar động cho Ribbon Toolbar', subtitle: 'Đã hoàn thành', time: 'High Priority', body: 'Thay đổi các item trong Toolbar tùy theo Tab Menu đang chọn.' },
    { id: 302, title: 'Tích hợp REST API từ Quarkus', subtitle: 'Đang làm', time: 'High Priority', body: 'Đấu nối dữ liệu thật từ Backend Java.' },
  ]
};

// 1. TOP BAR
const TopBar = memo(({ activeFolder, showDemoDialog }) => (
  <Stack horizontal verticalAlign="center" horizontalAlign="space-between" styles={headerStackStyles} tokens={{ childrenGap: 10 }}>
    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
      <IconButton iconProps={{ iconName: 'WaffleOffice365' }} styles={{ root: { color: 'white' } }} />
      <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, color: 'white' } }}>
        Outlook Web
      </Text>
    </Stack>

    <Stack styles={{ root: { flex: 1, maxWidth: 500 } }}>
      <SearchBox placeholder={`Search in ${activeFolder}...`} underlined styles={{ root: { background: 'white', height: 28, borderRadius: 2 } }} />
    </Stack>

    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
      <IconButton iconProps={{ iconName: 'Calendar' }} styles={{ root: { color: 'white' } }} onClick={() => showDemoDialog('Calendar Quick View', 'Hiển thị Lịch vắn tắt góc phải.')} />
      <IconButton iconProps={{ iconName: 'Settings' }} styles={{ root: { color: 'white' } }} onClick={() => showDemoDialog('Settings', 'Mở bảng Cấu hình hệ thống Outlook.')} />
      <IconButton iconProps={{ iconName: 'Help' }} styles={{ root: { color: 'white' } }} onClick={() => showDemoDialog('Help', 'Trung tâm Trợ giúp & Hướng dẫn sử dụng.')} />
      <Persona text="Dev User" hidePersonaDetails size={28} />
    </Stack>
  </Stack>
));

// 2. MENU BAR (File, Home, View, Help) + TOGGLE SIDE PANE
const MenuBar = memo(({ activeMenu, setActiveMenu, isTreeBarVisible, toggleTreeBar }) => {
  const menus = ['File', 'Home', 'View', 'Help'];
  return (
    <Stack horizontal verticalAlign="center" styles={menuBarStackStyles} tokens={{ childrenGap: 4 }}>
      <IconButton
        iconProps={{ iconName: 'GlobalNavButton' }}
        title={isTreeBarVisible ? "Thu gọn thanh Thư mục" : "Mở rộng thanh Thư mục"}
        onClick={toggleTreeBar}
        styles={{
          root: {
            height: 26, width: 28,
            color: isTreeBarVisible ? '#0078d4' : '#605e5c',
            background: isTreeBarVisible ? '#e1dfdd' : 'transparent',
            marginRight: 4
          }
        }}
      />

      {menus.map((menu) => (
        <DefaultButton
          key={menu}
          text={menu}
          onClick={() => setActiveMenu(menu)}
          styles={{
            root: {
              border: 'none', height: 26, padding: '0 10px',
              background: activeMenu === menu ? '#ffffff' : 'transparent',
              fontWeight: activeMenu === menu ? '600' : '400',
              color: activeMenu === menu ? '#0078d4' : '#323130'
            }
          }}
        />
      ))}
    </Stack>
  );
});

// 3. RIBBON TOOLBAR
const RibbonToolbar = memo(({ activeMenu, activeModule, selectedItem, showDemoDialog, isTreeBarVisible, toggleTreeBar }) => {
  const items = useMemo(() => {
    switch (activeMenu) {
      case 'File':
        return [
          { key: 'save', text: 'Save As', iconProps: { iconName: 'Save' }, onClick: () => showDemoDialog('File: Save As', `Lưu "${selectedItem?.title || 'Item'}"`) },
          { key: 'print', text: 'Print', iconProps: { iconName: 'Print' }, onClick: () => showDemoDialog('File: Print', `Xuất bản in.`) },
          { key: 'export', text: 'Export Data', iconProps: { iconName: 'Export' }, onClick: () => showDemoDialog('File: Export', `Xuất file Excel/CSV.`) }
        ];
      case 'View':
        return [
          { key: 'togglePane', text: isTreeBarVisible ? 'Hide Folder Pane' : 'Show Folder Pane', iconProps: { iconName: isTreeBarVisible ? 'HidePanel' : 'ShowPanel' }, onClick: toggleTreeBar },
          { key: 'viewPane', text: 'Reading Pane', iconProps: { iconName: 'SinglePane' }, onClick: () => showDemoDialog('View: Reading Pane', `Xem trước nội dung.`) }
        ];
      case 'Help':
        return [
          { key: 'helpDocs', text: 'Help Documentation', iconProps: { iconName: 'Help' }, onClick: () => showDemoDialog('Help: Docs', `Mở tài liệu hướng dẫn.`) },
          { key: 'about', text: 'About App', iconProps: { iconName: 'Info' }, onClick: () => showDemoDialog('Help: About', `Outlook Web UI v2.5 - React Routing.`) }
        ];
      case 'Home':
      default:
        return [
          { key: 'newItem', text: activeModule === 'mail' ? 'New Mail' : 'New Item', iconProps: { iconName: 'Add' }, onClick: () => showDemoDialog('Home: New Item', `Tạo mới ${activeModule.toUpperCase()}.`) },
          { key: 'delete', text: 'Delete', iconProps: { iconName: 'Delete' }, onClick: () => showDemoDialog('Home: Delete', `Đã xóa: "${selectedItem?.title || ''}"`) },
          { key: 'reply', text: 'Reply', iconProps: { iconName: 'Reply' }, onClick: () => showDemoDialog('Home: Reply', `Phản hồi: ${selectedItem?.title || ''}`) }
        ];
    }
  }, [activeMenu, activeModule, selectedItem, showDemoDialog, isTreeBarVisible, toggleTreeBar]);

  return (
    <div style={{ borderBottom: '1px solid #edebe9', background: '#faf9f8' }}>
      <CommandBar items={items} styles={{ root: { height: 40, padding: 0 } }} />
    </div>
  );
});

// MAIN APPLICATION WITH ROUTING
function App() {
  const [activeModule, setActiveModule] = useState('mail');
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedItemId, setSelectedItemId] = useState(1);
  const [activeMenu, setActiveMenu] = useState('Home');
  const [isTreeBarVisible, setIsTreeBarVisible] = useState(true);

  // Dialog State
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', message: '' });

  // 1. Đọc Hash URL khi khởi chạy hoặc khi URL thay đổi (VD: #/mail/inbox/1)
  const syncStateFromUrl = useCallback(() => {
    const hash = window.location.hash.replace('#/', ''); // Lấy chuỗi sau #/
    if (!hash) return;

    const [mod, folder, idStr] = hash.split('/');
    if (mod) setActiveModule(mod);
    if (folder) setActiveFolder(folder);
    if (idStr) setSelectedItemId(Number(idStr));
  }, []);

  useEffect(() => {
    syncStateFromUrl();
    window.addEventListener('hashchange', syncStateFromUrl);
    return () => window.removeEventListener('hashchange', syncStateFromUrl);
  }, [syncStateFromUrl]);

  // 2. Hàm cập nhật URL Hash
  const navigateTo = useCallback((moduleName, folderKey, itemId = null) => {
    let newHash = `/${moduleName}/${folderKey}`;
    if (itemId) newHash += `/${itemId}`;
    window.location.hash = newHash;
  }, []);

  // Chuyển Module
  const handleModuleChange = useCallback((moduleName, defaultFolder) => {
    const initialList = folderDataStore[defaultFolder] || [];
    const firstId = initialList[0]?.id || null;
    navigateTo(moduleName, defaultFolder, firstId);
  }, [navigateTo]);

  // Chuyển Folder
  const handleFolderChange = useCallback((folderKey) => {
    const list = folderDataStore[folderKey] || [];
    const firstId = list[0]?.id || null;
    navigateTo(activeModule, folderKey, firstId);
  }, [activeModule, navigateTo]);

  // Chọn Item
  const handleItemSelect = useCallback((id) => {
    navigateTo(activeModule, activeFolder, id);
  }, [activeModule, activeFolder, navigateTo]);

  const toggleTreeBar = useCallback(() => setIsTreeBarVisible(prev => !prev), []);
  const showDemoDialog = useCallback((title, message) => setDialogConfig({ isOpen: true, title, message }), []);
  const closeDialog = useCallback(() => setDialogConfig(prev => ({ ...prev, isOpen: false })), []);

  const currentList = folderDataStore[activeFolder] || [];
  const selectedItem = useMemo(() => {
    return currentList.find(item => item.id === selectedItemId) || currentList[0] || null;
  }, [currentList, selectedItemId]);

  const renderFolderButton = (key, icon, label) => (
    <ActionButton 
      key={key}
      iconProps={{ iconName: icon }} 
      text={label} 
      onClick={() => handleFolderChange(key)}
      styles={{ 
        root: { 
          background: activeFolder === key ? '#e1dfdd' : 'transparent',
          fontWeight: activeFolder === key ? '600' : 'normal',
          borderRadius: 4
        } 
      }}
    />
  );

  const renderFolderTree = () => {
    switch (activeModule) {
      case 'mail':
        return (
          <Stack tokens={{ childrenGap: 4 }}>
            <PrimaryButton iconProps={{ iconName: 'Add' }} text="New Mail" styles={{ root: { marginBottom: 10 } }} onClick={() => showDemoDialog('New Mail', 'Form tạo mail.')} />
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, paddingLeft: 8 } }}>Folders</Text>
            {renderFolderButton('inbox', 'Inbox', `Inbox (${folderDataStore.inbox.length})`)}
            {renderFolderButton('sent', 'Send', 'Sent Items')}
            {renderFolderButton('deleted', 'Delete', 'Deleted Items')}
            {renderFolderButton('archive', 'Archive', 'Archive')}
          </Stack>
        );
      case 'calendar':
        return (
          <Stack tokens={{ childrenGap: 4 }}>
            <PrimaryButton iconProps={{ iconName: 'Add' }} text="New Event" styles={{ root: { marginBottom: 10 } }} onClick={() => showDemoDialog('New Event', 'Tạo sự kiện.')} />
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, paddingLeft: 8 } }}>Calendars</Text>
            {renderFolderButton('my_calendar', 'Calendar', 'My Calendar')}
          </Stack>
        );
      case 'people':
        return (
          <Stack tokens={{ childrenGap: 4 }}>
            <PrimaryButton iconProps={{ iconName: 'Add' }} text="New Contact" styles={{ root: { marginBottom: 10 } }} onClick={() => showDemoDialog('New Contact', 'Thêm danh bạ.')} />
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, paddingLeft: 8 } }}>Contacts</Text>
            {renderFolderButton('all_contacts', 'People', 'All Contacts')}
          </Stack>
        );
      case 'todo':
        return (
          <Stack tokens={{ childrenGap: 4 }}>
            <PrimaryButton iconProps={{ iconName: 'Add' }} text="Add Task" styles={{ root: { marginBottom: 10 } }} onClick={() => showDemoDialog('Add Task', 'Tạo công việc.')} />
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, paddingLeft: 8 } }}>My Tasks</Text>
            {renderFolderButton('my_day', 'Sun', 'My Day')}
          </Stack>
        );
      default: return null;
    }
  };

  return (
    <Stack styles={containerStackStyles}>
      <TopBar activeFolder={activeFolder} showDemoDialog={showDemoDialog} />
      
      <MenuBar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        isTreeBarVisible={isTreeBarVisible}
        toggleTreeBar={toggleTreeBar}
      />
      
      <RibbonToolbar 
        activeMenu={activeMenu} 
        activeModule={activeModule} 
        selectedItem={selectedItem} 
        showDemoDialog={showDemoDialog}
        isTreeBarVisible={isTreeBarVisible}
        toggleTreeBar={toggleTreeBar}
      />

      <Stack horizontal styles={bodyStackStyles}>
        {/* Mini Sidebar */}
        <Stack styles={miniSidebarStyles} tokens={{ childrenGap: 12 }}>
          <IconButton 
            iconProps={{ iconName: 'Mail' }} 
            title="Mail"
            styles={{ root: { color: activeModule === 'mail' ? '#0078d4' : '#605e5c', background: activeModule === 'mail' ? '#edebe9' : 'transparent' } }} 
            onClick={() => handleModuleChange('mail', 'inbox')}
          />
          <IconButton 
            iconProps={{ iconName: 'Calendar' }} 
            title="Calendar"
            styles={{ root: { color: activeModule === 'calendar' ? '#0078d4' : '#605e5c', background: activeModule === 'calendar' ? '#edebe9' : 'transparent' } }} 
            onClick={() => handleModuleChange('calendar', 'my_calendar')}
          />
          <IconButton 
            iconProps={{ iconName: 'People' }} 
            title="People"
            styles={{ root: { color: activeModule === 'people' ? '#0078d4' : '#605e5c', background: activeModule === 'people' ? '#edebe9' : 'transparent' } }} 
            onClick={() => handleModuleChange('people', 'all_contacts')}
          />
          <IconButton 
            iconProps={{ iconName: 'CheckList' }} 
            title="To Do"
            styles={{ root: { color: activeModule === 'todo' ? '#0078d4' : '#605e5c', background: activeModule === 'todo' ? '#edebe9' : 'transparent' } }} 
            onClick={() => handleModuleChange('todo', 'my_day')}
          />
        </Stack>

        {/* Side Pane */}
        {isTreeBarVisible && (
          <Stack styles={sidePaneStackStyles}>
            {renderFolderTree()}
          </Stack>
        )}

        {/* Workspace */}
        <Stack horizontal styles={{ root: { flex: 1 } }}>
          {/* Middle List */}
          <Stack styles={{ root: { width: 320, borderRight: '1px solid #edebe9', overflowY: 'auto' } }}>
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, padding: '12px 15px', color: '#0078d4', textTransform: 'capitalize' } }}>
              {activeFolder.replace('_', ' ')}
            </Text>
            {currentList.length > 0 ? (
              currentList.map(item => (
                <Stack
                  key={item.id}
                  tokens={{ padding: '12px 15px' }}
                  styles={{ root: { 
                    cursor: 'pointer', 
                    borderBottom: '1px solid #f3f2f1',
                    background: selectedItem?.id === item.id ? '#edf6fd' : 'transparent',
                    borderLeft: selectedItem?.id === item.id ? '3px solid #0078d4' : '3px solid transparent',
                    selectors: { ':hover': { background: '#f3f2f1' } }
                  }}}
                  onClick={() => handleItemSelect(item.id)}
                >
                  <Stack horizontal horizontalAlign="space-between">
                    <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>{item.title}</Text>
                    <Text variant="small" styles={{ root: { color: '#605e5c' } }}>{item.time}</Text>
                  </Stack>
                  <Text variant="medium" styles={{ root: { color: '#323130' } }}>{item.subtitle}</Text>
                </Stack>
              ))
            ) : (
              <Text variant="medium" styles={{ root: { padding: '15px', color: '#605e5c' } }}>Thư mục trống.</Text>
            )}
          </Stack>

          {/* Details Content View */}
          <Stack styles={mainContentStackStyles} tokens={{ childrenGap: 15 }}>
            {selectedItem ? (
              <>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                  <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>{selectedItem.title}</Text>
                  <Stack horizontal tokens={{ childrenGap: 5 }}>
                    <IconButton iconProps={{ iconName: 'Edit' }} title="Edit" onClick={() => showDemoDialog('Edit', `Chỉnh sửa: ${selectedItem.title}`)} />
                    <IconButton iconProps={{ iconName: 'Delete' }} title="Delete" onClick={() => showDemoDialog('Delete', `Xóa mục: ${selectedItem.title}`)} />
                  </Stack>
                </Stack>

                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 10 }}>
                  <Persona text={selectedItem.title} secondaryText={selectedItem.subtitle} size={38} />
                  <Text variant="small" styles={{ root: { color: '#605e5c' } }}>{selectedItem.time}</Text>
                </Stack>

                <div style={{ padding: '15px 0', lineHeight: '1.6', color: '#201f1e' }}>
                  <p><strong>Nội dung chi tiết:</strong></p>
                  <p>{selectedItem.body}</p>
                </div>
              </>
            ) : (
              <Text variant="medium" styles={{ root: { color: '#605e5c', padding: '20px' } }}>Không có mục nào được chọn.</Text>
            )}
          </Stack>
        </Stack>
      </Stack>

      <Dialog
        hidden={!dialogConfig.isOpen}
        onDismiss={closeDialog}
        dialogContentProps={{
          type: DialogType.normal,
          title: dialogConfig.title,
          subText: dialogConfig.message,
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={closeDialog} text="OK" />
        </DialogFooter>
      </Dialog>
    </Stack>
  );
}

export default App;