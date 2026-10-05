import { useEffect, useState, useCallback } from 'react';

// Chuyển đổi Object <-> Query String dạng `#key1=val1&key2=val2`
const decode = () => {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const result = {};
  
  for (const [key, value] of params.entries()) {
    try {
      // Tự động convert số, boolean, object/array nếu có
      result[key] = JSON.parse(value);
    } catch {
      // Nếu là string thông thường
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
};

const encode = (obj) => {
  if (!obj || typeof obj !== 'object') return '';
  const params = new URLSearchParams();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      );
    }
  });

  const queryString = params.toString();
  return queryString ? '#' + queryString : '';
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
      if (JSON.stringify(value) === JSON.stringify(prev)) return prev;

      const url = encode(value) || location.pathname;
      (replace ? history.replaceState : history.pushState).call(history, value, '', url);
      return value;
    });
  }, []);

  return [state, nav];
}