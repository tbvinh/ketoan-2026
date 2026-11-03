import { useState } from 'react';
import { useAuth } from './auth.jsx';
import { useI18n, LangSwitch } from './i18n.jsx';
import { Spinner } from './ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [u, setU] = useState('admin');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');     // chuỗi thông báo; rỗng = không lỗi
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;                      // chặn bấm Enter/Click liên tiếp
    setBusy(true); setErr('');
    try {
      await login(u.trim(), p);            // auth.jsx: gọi /loginv1 (server set cookie HttpOnly) rồi nạp thông tin user
      // Thành công: App chuyển màn hình nên không cần setBusy(false) ở đây
    } catch (ex) {
      // 401/403 = sai tài khoản hoặc mật khẩu; lỗi khác (mạng, 500…) hiện nguyên nhân thật để dễ xử lý
      const wrongCreds = ex?.status === 401 || ex?.status === 403;
      setErr(wrongCreds || !ex?.message ? t('login.error') : ex.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form onSubmit={submit}>
        <LangSwitch />
        <h2>{t('login.title')}</h2>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder={t('login.user')}
          autoComplete="username" autoFocus disabled={busy} />
        <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder={t('login.pass')}
          autoComplete="current-password" disabled={busy} />
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" disabled={busy || !u.trim() || !p}>{busy && <Spinner />}{t('login.submit')}</button>
        <small className="muted">{t('login.hint')}</small>
      </form>
    </div>
  );
}