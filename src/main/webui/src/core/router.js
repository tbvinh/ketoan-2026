import { useEffect, useState, useCallback } from 'react';

// Toàn bộ điều hướng (plugin đang mở, state của nó, từ khóa tìm kiếm) được
// mã hóa vào location.hash, nên nút Back/Forward của trình duyệt (và nút
// trong topbar) di chuyển được giữa các "trang" của ứng dụng.
const decode = () => {
  try { return JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch { return null; }
};
const encode = (s) => '#' + encodeURIComponent(JSON.stringify(s));

export function useHistoryState(initial) {
  const [state, setLocal] = useState(() => decode() ?? initial);

  useEffect(() => {
    if (!location.hash) history.replaceState(state, '', encode(state));
    const onPop = () => setLocal(decode() ?? initial);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // replace: true  -> cập nhật trang hiện tại (gõ chữ, tick checkbox…), không sinh entry mới
  // replace: false -> điều hướng thật sự (đổi plugin, mở thư, submit tìm kiếm…), Back/Forward dùng được
  const nav = useCallback((next, { replace = false } = {}) => {
    setLocal((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (JSON.stringify(value) === JSON.stringify(prev)) return prev;
      const url = encode(value);
      (replace ? history.replaceState : history.pushState).call(history, value, '', url);
      return value;
    });
  }, []);

  return [state, nav];
}
