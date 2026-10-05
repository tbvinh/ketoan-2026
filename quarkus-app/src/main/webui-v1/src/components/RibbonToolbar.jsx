
import React from 'react';
import { CommandBar } from '@fluentui/react';

const ribbonStyles = {
  root: {
    height: 44,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #edebe9',
    paddingLeft: 8
  }
};

export const RibbonToolbar = ({ activeMenu, activeModule, showDemoDialog }) => {

  // Nút bấm theo Tab 'Trang chủ'
  const homeItems = [
    {
      key: 'newItem',
      text: `Tạo mới ${activeModule.toUpperCase()}`,
      iconProps: { iconName: 'Add' },
      onClick: () => showDemoDialog('Tạo mới', `Mở form thêm mới cho ${activeModule}`)
    },
    {
      key: 'delete',
      text: 'Xóa',
      iconProps: { iconName: 'Delete' },
      onClick: () => showDemoDialog('Xóa', 'Thực hiện xóa item đang chọn')
    },
    {
      key: 'archive',
      text: 'Lưu trữ',
      iconProps: { iconName: 'Archive' },
      onClick: () => showDemoDialog('Lưu trữ', 'Chuyển mục này vào kho lưu trữ')
    }
  ];

  // Nút bấm theo Tab 'Xem'
  const viewItems = [
    {
      key: 'refresh',
      text: 'Làm mới',
      iconProps: { iconName: 'Refresh' },
      onClick: () => showDemoDialog('Làm mới', 'Đang đồng bộ dữ liệu từ server...')
    },
    {
      key: 'zoom',
      text: 'Phóng to / Thu nhỏ',
      iconProps: { iconName: 'Zoom' },
      onClick: () => showDemoDialog('Thu phóng', 'Điều chỉnh tỉ lệ hiển thị')
    }
  ];

  // Nút bấm theo Tab 'Trợ giúp'
  const helpItems = [
    {
      key: 'support',
      text: 'Hỗ trợ kỹ thuật',
      iconProps: { iconName: 'Help' },
      onClick: () => showDemoDialog('Hỗ trợ', 'Mở trang hướng dẫn sử dụng')
    }
  ];

  const getItems = () => {
    switch (activeMenu) {
      case 'View': return viewItems;
      case 'Help': return helpItems;
      default: return homeItems;
    }
  };

  return (
    <CommandBar
      items={getItems()}
      styles={ribbonStyles}
    />
  );
};