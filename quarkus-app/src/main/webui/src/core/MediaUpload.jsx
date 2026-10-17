import { useRef, useState } from 'react';
import { API_BASE, handleUnauthorized } from './api.js';
import { tenantHeaders } from './tenant.js';
import { useI18n } from './i18n.jsx';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = /\.(svg|png|jpe?g|gif|webp|bmp)$/i;

function upload(file, type) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/api/media/upload');
    xhr.withCredentials = true;
    Object.entries(tenantHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onload = () => {
      if (xhr.status === 401) handleUnauthorized();
      let data = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { data = xhr.responseText; }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) resolve(data.url);
      else reject(new Error(data?.message ?? data?.error ?? xhr.statusText));
    };
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('type', type);
    xhr.send(form);
  });
}

/** Ô chọn ảnh + xem trước; ảnh được Nginx phục vụ trực tiếp qua /uploads/... */
export default function MediaUpload({ type = 'products', value = '', onChange }) {
  const { t } = useI18n();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED.test(file.name)) { setError(t('media.invalid')); return; }
    if (file.size > MAX_SIZE) { setError(t('media.tooLarge')); return; }
    setBusy(true);
    setError('');
    try { onChange(await upload(file, type)); }
    catch (err) { setError(err?.message || t('media.failed')); }
    finally { setBusy(false); }
  };

  return (
    <div className="mediaupload">
      <div className="mediaframe">
        {value
          ? <img src={value} alt={t('media.preview')} />
          : <span aria-hidden="true">🖼️</span>}
      </div>
      <div className="mediaactions">
        <div className="mediabuttons">
          <button type="button" className="tb" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t('media.uploading') : value ? t('media.change') : t('media.choose')}
          </button>
          {value && (
            <button type="button" className="tb" disabled={busy} onClick={() => onChange('')}>
              {t('media.remove')}
            </button>
          )}
        </div>
        <p className="muted">{t('media.hint')}</p>
        {error && <p className="formError" role="alert">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*,.svg" hidden onChange={choose} />
    </div>
  );
}
