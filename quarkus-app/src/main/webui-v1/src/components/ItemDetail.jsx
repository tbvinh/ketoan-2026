
import React, { useState, useEffect } from 'react';
import { Stack, Text, Persona, IconButton, Spinner } from '@fluentui/react';
import { apiService } from '../services/api';

export const ItemDetail = ({ selectedItemId, showDemoDialog }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedItemId) {
      setDetail(null);
      return;
    }
    let isMounted = true;
    setLoading(true);

    // Gọi API lấy Chi tiết Item
    apiService.getItemDetailById(selectedItemId)
      .then(data => { if (isMounted) setDetail(data); })
      .catch(err => console.error(err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [selectedItemId]);

  if (loading) return <Spinner label="Loading details..." styles={{ root: { flex: 1, padding: 40 } }} />;

  if (!detail) {
    return (
      <Stack styles={{ root: { flex: 1, padding: 20 } }}>
        <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>Không có mục nào được chọn.</Text>
      </Stack>
    );
  }

  return (
    <Stack styles={{ root: { flex: 1, padding: 20, background: 'white', overflowY: 'auto' } }} tokens={{ childrenGap: 15 }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>{detail.title}</Text>
        <Stack horizontal tokens={{ childrenGap: 5 }}>
          <IconButton iconProps={{ iconName: 'Edit' }} title="Edit" onClick={() => showDemoDialog('Edit', `Chỉnh sửa: ${detail.title}`)} />
          <IconButton iconProps={{ iconName: 'Delete' }} title="Delete" onClick={() => showDemoDialog('Delete', `Xóa mục: ${detail.title}`)} />
        </Stack>
      </Stack>

      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 10 }}>
        <Persona text={detail.title} secondaryText={detail.subtitle} size={38} />
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>{detail.time}</Text>
      </Stack>

      <div style={{ padding: '15px 0', lineHeight: '1.6', color: '#201f1e' }}>
        <p><strong>Nội dung chi tiết:</strong></p>
        <p>{detail.body}</p>
      </div>
    </Stack>
  );
};