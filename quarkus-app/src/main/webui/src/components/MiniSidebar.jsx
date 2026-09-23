
import React from 'react';
import { Stack, IconButton } from '@fluentui/react';

const sidebarStyles = {
  root: {
    width: 48,
    backgroundColor: '#f3f2f1',
    borderRight: '1px solid #edebe9',
    paddingTop: 8,
    paddingBottom: 8
  }
};

export const MiniSidebar = ({ activeModule, onModuleSelect }) => {
  const modules = [
    { key: 'mail', icon: 'Mail', title: 'Thư điện tử' },
    { key: 'calendar', icon: 'Calendar', title: 'Lịch làm việc' },
    { key: 'people', icon: 'People', title: 'Danh bạ' },
    { key: 'todo', icon: 'CheckList', title: 'Công việc (To Do)' }
  ];

  return (
    <Stack styles={sidebarStyles} verticalAlign="space-between" horizontalAlign="center">
      <Stack tokens={{ childrenGap: 8 }}>
        {modules.map(mod => (
          <IconButton
            key={mod.key}
            iconProps={{ iconName: mod.icon }}
            title={mod.title}
            ariaLabel={mod.title}
            onClick={() => onModuleSelect(mod.key)}
            styles={{
              root: {
                width: 38,
                height: 38,
                borderRadius: 4,
                backgroundColor: activeModule === mod.key ? '#e1dfdd' : 'transparent',
                color: activeModule === mod.key ? '#0078d4' : '#605e5c'
              },
              rootHovered: {
                backgroundColor: '#e1dfdd',
                color: '#0078d4'
              }
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
};