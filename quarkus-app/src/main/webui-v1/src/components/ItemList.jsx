
import React, { useState, useEffect } from 'react';
import { Stack, Text, Spinner } from '@fluentui/react';
import { apiService } from '../services/api';

export const ItemList = ({ activeFolder, selectedItemId, onItemSelect }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeFolder) return;
    let isMounted = true;
    setLoading(true);

    // Gọi API lấy danh sách theo Folder
    apiService.getItemsByFolder(activeFolder)
      .then(data => {
        if (isMounted) {
          setItems(data);
          // Tự động chọn item đầu tiên nếu chưa chọn
          if (data.length > 0 && !selectedItemId) {
            onItemSelect(data[0].id);
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [activeFolder]);

  return (
    <Stack styles={{ root: { width: 320, borderRight: '1px solid #edebe9', overflowY: 'auto' } }}>
      <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, padding: '12px 15px', color: '#0078d4', textTransform: 'capitalize' } }}>
        {activeFolder.replace('_', ' ')}
      </Text>

      {loading ? (
        <Spinner label="Loading items..." styles={{ root: { padding: 20 } }} />
      ) : items.length > 0 ? (
        items.map(item => (
          <Stack
            key={item.id}
            tokens={{ padding: '12px 15px' }}
            styles={{ root: { 
              cursor: 'pointer', 
              borderBottom: '1px solid #f3f2f1',
              background: selectedItemId === item.id ? '#edf6fd' : 'transparent',
              borderLeft: selectedItemId === item.id ? '3px solid #0078d4' : '3px solid transparent',
              selectors: { ':hover': { background: '#f3f2f1' } }
            }}}
            onClick={() => onItemSelect(item.id)}
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
  );
};