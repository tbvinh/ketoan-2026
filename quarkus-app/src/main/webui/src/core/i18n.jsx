import { createContext, useContext, useState } from 'react';

const dict = { vi: {}, en: {} };
// Plugin đăng ký bản dịch riêng của mình qua plugin.messages
export const addMessages = (m) => Object.keys(m).forEach((l) => Object.assign((dict[l] ??= {}), m[l]));

addMessages({
  vi: {
    'app.name': 'Kế toán', 'logout': 'Đăng xuất',
    'login.title': 'Đăng nhập', 'login.user': 'Tên đăng nhập', 'login.pass': 'Mật khẩu',
    'login.submit': 'Đăng nhập', 'login.error': 'Sai tên đăng nhập hoặc mật khẩu.',
    'login.hint': 'Tài khoản demo: admin/123456 (Quản trị) · demo/123456 (Người dùng)',
    'common.refresh': 'Làm mới', 'common.searchIn': 'Tìm trong', 'nav.back': 'Quay lại', 'nav.forward': 'Tiến tới', 'perm.denied': 'Bạn không có quyền xem nội dung này. Liên hệ Quản trị viên.', 'role.admin': 'Quản trị viên', 'role.user': 'Người dùng', 'ac.empty': 'Không tìm thấy kết quả.', 'ac.create': 'Thêm mới',
  },
  en: {
    'app.name': 'Ke toan', 'logout': 'Sign out',
    'login.title': 'Sign in', 'login.user': 'Username', 'login.pass': 'Password',
    'login.submit': 'Sign in', 'login.error': 'Incorrect username or password.',
    'login.hint': 'Demo accounts: admin/123456 (Admin) · demo/123456 (User)',
    'common.refresh': 'Refresh', 'common.searchIn': 'Search in', 'nav.back': 'Back', 'nav.forward': 'Forward', 'perm.denied': 'You do not have permission to view this. Contact an Admin.', 'role.admin': 'Admin', 'role.user': 'User', 'ac.empty': 'No results found.', 'ac.create': 'Add new',
  },
});

const Ctx = createContext();
export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'vi');
  const change = (l) => { localStorage.setItem('lang', l); setLang(l); };
  const t = (k) => dict[lang]?.[k] ?? dict.vi[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang: change, t }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <select className="lang" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
    </select>
  );
}
