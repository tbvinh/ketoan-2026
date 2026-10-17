import { useEffect, useState } from 'react';
import { apiFetch } from './api.js';
import { useAuth } from './auth.jsx';
import { addMessages, useI18n } from './i18n.jsx';
import pkg from '../../package.json';

addMessages({
  vi: { 'status.copyright': '© 2026 VinhCC', 'status.db': 'DB', 'status.user': 'Người dùng', 'status.app': 'Phiên bản', 'status.build': 'Bản dựng' },
  en: { 'status.copyright': '© 2026 VinhCC', 'status.db': 'DB', 'status.user': 'User', 'status.app': 'App', 'status.build': 'Build' },
});

const BUILD = import.meta.env.VITE_BUILD_NUMBER || import.meta.env.VITE_APP_VERSION || pkg.version;

export default function StatusBar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    apiFetch('/api/system/info', { silent401: true })
      .then((data) => { if (alive) setInfo(data); })
      .catch(() => { /* status bar chỉ là thông tin phụ */ });
    return () => { alive = false; };
  }, []);

  return (
    <footer className="statusbar">
      <span>{t('status.copyright')}</span>
      <span title={info?.dbVersion}>{t('status.db')}: {info?.dbName ?? '…'}</span>
      <span>{t('status.user')}: {user?.username ?? '—'}</span>
      <span>{t('status.app')}: {info?.appVersion ?? '…'}</span>
      <span>{t('status.build')}: {BUILD}</span>
    </footer>
  );
}
