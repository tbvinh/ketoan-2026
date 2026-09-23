
import React from 'react';
import { Stack, CommandBar, IconButton } from '@fluentui/react';

const menuBarStyles = {
  root: {
    height: 34,
    backgroundColor: '#f3f2f1',
    borderBottom: '1px solid #edebe9',
    paddingLeft: 4,
    paddingRight: 8,
  }
};

const commandBarStyles = {
  root: {
    height: 34,
    backgroundColor: 'transparent',
    padding: 0,
  }
};

export const MenuBar = ({ activeMenu, setActiveMenu, isTreeBarVisible, toggleTreeBar }) => {

  // Cấu hình danh sách các Menu Tab chính
  const menuItems = [
    {
      key: 'Home',
      text: 'Trang chủ',
      onClick: () => setActiveMenu('Home'),
      styles: {
        root: {
          backgroundColor: activeMenu === 'Home' ? '#ffffff' : 'transparent',
          fontWeight: activeMenu === 'Home' ? '600' : 'normal',
          borderBottom: activeMenu === 'Home' ? '2px solid #0078d4' : '2px solid transparent',
        }
      }
    },
    {
      key: 'View',
      text: 'Xem',
      onClick: () => setActiveMenu('View'),
      styles: {
        root: {
          backgroundColor: activeMenu === 'View' ? '#ffffff' : 'transparent',
          fontWeight: activeMenu === 'View' ? '600' : 'normal',
          borderBottom: activeMenu === 'View' ? '2px solid #0078d4' : '2px solid transparent',
        }
      }
    },
    {
      key: 'Help',
      text: 'Trợ giúp',
      onClick: () => setActiveMenu('Help'),
      styles: {
        root: {
          backgroundColor: activeMenu === 'Help' ? '#ffffff' : 'transparent',
          fontWeight: activeMenu === 'Help' ? '600' : 'normal',
          borderBottom: activeMenu === 'Help' ? '2px solid #0078d4' : '2px solid transparent',
        }
      }
    }
  ];

  return (
    <Stack horizontal verticalAlign="center" horizontalAlign="space-between" styles={menuBarStyles}>
      
      {/* Left Area: Toggle Navigation Pane + Menu Tabs */}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
        <IconButton
          iconProps={{ iconName: 'GlobalNavButton' }}
          title={isTreeBarVisible ? "Ẩn thanh thư mục" : "Hiện thanh thư mục"}
          ariaLabel="Toggle Navigation"
          onClick={toggleTreeBar}
          styles={{
            root: { height: 28, width: 28 },
            rootHovered: { backgroundColor: '#e1dfdd' }
          }}
        />

        <CommandBar
          items={menuItems}
          styles={commandBarStyles}
        />
      </Stack>

    </Stack>
  );
};