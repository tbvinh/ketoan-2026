import { useEffect, useState, useCallback } from 'react';

// Encode JSON -> Base64 URL Safe
const encode = (data) => {
  if (!data) return '';
  try {
    const jsonStr = JSON.stringify(data);
    // Mã hóa utf-8 sang Base64
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return '#s=' + base64;
  } catch {
    return '';
  }
};

// Decode Base64 URL Safe -> JSON
const decode = () => {
  const hash = location.hash.slice(1);
  if (!hash.startsWith('s=')) return null;
  try {
    let base64 = hash.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
};

export function useHistoryState(initial) {
  const [state, setLocal] = useState(() => decode() ?? initial);

  useEffect(() => {
    if (!location.hash && state) {
      history.replaceState(state, '', encode(state) || location.pathname);
    }
    const onPop = () => setLocal(decode() ?? initial);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = useCallback((next, { replace = false } = {}) => {
    setLocal((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;

      // Nếu logout hoặc truyền null/{} -> Dọn sạch URL Hash
    if (!value || Object.keys(value).length === 0) {
      history.replaceState(null, '', location.pathname + location.search);
      return initial;
    }

      if (JSON.stringify(value) === JSON.stringify(prev)) return prev;

      const url = encode(value) || location.pathname;
      (replace ? history.replaceState : history.pushState).call(history, value, '', url);
      return value;
    });
  }, [initial]);

  return [state, nav];
}