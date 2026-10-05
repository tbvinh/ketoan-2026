import { createContext, useContext, useState } from 'react';
import { fakeApi } from './api.js';

// Dummy user DB: role quyết định menu Quản trị và quyền CRUD của từng plugin
const USERS = [
  { u: 'admin', p: '123456', role: 'admin', name: 'Quản trị viên' },
  { u: 'demo', p: '123456', role: 'user', name: 'Người dùng Demo' },
];

const Ctx = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const login = async (u, p) => {
    // API đăng nhập giả: trả về thông tin user kèm role (thay bằng API thật khi có backend)
    const found = await fakeApi(USERS.find((x) => x.u === u && x.p === p) ?? null, 600);
    if (!found) throw new Error('invalid');
    const info = { username: found.u, name: found.name, role: found.role };
    localStorage.setItem('user', JSON.stringify(info));
    setUser(info);
  };
  const logout = () => { 
    localStorage.removeItem('user'); setUser(null); 
      // 2. Xóa sạch phần `#...` đằng sau URL
    history.replaceState(null, '', window.location.pathname);
    // 3. (Tùy chọn) Chuyển hướng sang trang login hoặc reload lại ứng dụng
    //window.location.href = '/login'; 
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
