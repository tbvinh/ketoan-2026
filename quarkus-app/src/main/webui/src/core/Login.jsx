import { useState } from 'react';
import { useAuth } from './auth.jsx';
import { useI18n, LangSwitch } from './i18n.jsx';
import { Spinner } from './ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [u, setU] = useState('admin');
  const [p, setP] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(false);
    try { await login(u, p); } catch { setErr(true); setBusy(false); }
  };

  return (
    <div className="login">
      <form onSubmit={submit}>
        <LangSwitch />
        <h2>{t('login.title')}</h2>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder={t('login.user')} autoFocus />
        <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder={t('login.pass')} />
        {err && <p className="err">{t('login.error')}</p>}
        <button className="btn" disabled={busy}>{busy && <Spinner />}{t('login.submit')}</button>
        <small className="muted">{t('login.hint')}</small>
      </form>
    </div>
  );
}
