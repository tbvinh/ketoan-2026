import { createContext, useCallback, useContext, useState } from 'react';
import { addMessages, useI18n } from './i18n.jsx';

addMessages({
  vi: { 'confirm.yes': 'Đồng ý', 'confirm.no': 'Hủy', 'confirm.title': 'Xác nhận' },
  en: { 'confirm.yes': 'Yes', 'confirm.no': 'No', 'confirm.title': 'Confirm' },
});

const Ctx = createContext();

// confirm(message) trả về Promise<boolean> — dùng: if (await confirm('Xóa?')) { ...xóa... }
export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const confirm = useCallback((message) => new Promise((resolve) => setReq({ message, resolve })), []);
  const answer = (v) => { req.resolve(v); setReq(null); };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      {req && <ConfirmDialog message={req.message} onYes={() => answer(true)} onNo={() => answer(false)} />}
    </Ctx.Provider>
  );
}
export const useConfirm = () => useContext(Ctx);

function ConfirmDialog({ message, onYes, onNo }) {
  const { t } = useI18n();
  return (
    <div className="confirm-backdrop" onMouseDown={onNo}>
      <div className="confirm-box" role="alertdialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{t('confirm.title')}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="tb" onClick={onNo}>{t('confirm.no')}</button>
          <button className="btn danger" onClick={onYes} autoFocus>{t('confirm.yes')}</button>
        </div>
      </div>
    </div>
  );
}