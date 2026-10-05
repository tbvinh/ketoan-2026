
import React, { useState, useEffect } from 'react';
import { Stack, Text, ActionButton, PrimaryButton, Spinner } from '@fluentui/react';
import { apiService } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

export const FolderTree = ({ activeModule, activeFolder, onFolderSelect, showDemoDialog }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // Gọi API lấy Folder khi activeModule thay đổi
    apiService.getFoldersByModule(activeModule)
      .then(data => { if (isMounted) setFolders(data); })
      .catch(err => console.error(err))
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [activeModule]);

  if (loading) return <Spinner label="Loading folders..." styles={{ root: { padding: 20 } }} />;

  return (
    <Stack tokens={{ childrenGap: 4 }}>
      <PrimaryButton 
        iconProps={{ iconName: 'Add' }} 
        text={`New ${activeModule.toUpperCase()}`} 
        styles={{ root: { marginBottom: 10 } }} 
        onClick={() => showDemoDialog('New Item', `Form tạo mới cho ${activeModule}`)} 
      />
      <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, paddingLeft: 8 } }}>{t('folders')}</Text>
      
      {folders.map(folder => (
        <ActionButton 
          key={folder.key}
          iconProps={{ iconName: folder.icon || 'FolderSearch' }} 
          text={folder.count ? `${folder.label} (${folder.count})` : folder.label} 
          onClick={() => onFolderSelect(folder.key)}
          styles={{ 
            root: { 
              background: activeFolder === folder.key ? '#e1dfdd' : 'transparent',
              fontWeight: activeFolder === folder.key ? '600' : 'normal',
              borderRadius: 4
            } 
          }}
        />
      ))}
    </Stack>
  );
};