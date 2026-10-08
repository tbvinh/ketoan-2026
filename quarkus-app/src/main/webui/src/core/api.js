import { useEffect, useState } from 'react';

// Giả lập gọi API: trả dữ liệu sau ~1 giây
export const fakeApi = (data, ms = 800) =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms + Math.random() * 400));

// Hook: const { data, loading, error } = useApi(() => fetch..., [deps])
export function useApi(fetcher, deps) {
  const [s, setS] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    setS((x) => ({ ...x, loading: true, error: null }));
    fetcher()
      .then((data) => alive && setS({ data, loading: false, error: null }))
      .catch((error) => alive && setS({ data: null, loading: false, error }));
    return () => { alive = false; };
  }, deps);
  return s;
}

/* ---------- API thật (xác thực bằng HttpOnly cookie) ---------- */

// '' = cùng origin (nên dùng proxy của Vite khi dev). Nếu backend khác origin: VITE_API_BASE=http://localhost:8080
const API_BASE = import.meta.env?.VITE_API_BASE ?? '';

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;   // 0 = lỗi mạng / không kết nối được server
    this.data = data;
  }
}

// Khi server trả 401 (cookie hết hạn/không hợp lệ), auth.jsx đăng ký hàm này để đưa người dùng về màn hình đăng nhập.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/**
 * apiFetch('/api/xxx', { method, body, headers, silent401 })
 *  - credentials: 'include' => trình duyệt tự gửi/nhận cookie `token` (JS không đọc được cookie HttpOnly)
 *  - body là object => tự JSON.stringify
 *  - silent401: true => 401 không kích hoạt onUnauthorized (dùng cho chính request đăng nhập / kiểm tra phiên)
 */
export async function apiFetch(path, { method = 'GET', body, headers, silent401 = false, ...rest } = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...rest,
    });
  } catch (e) {
    throw new ApiError(0, e?.message ?? 'Network error');
  }

  // Server dev (Vite) trả index.html với mã 200 khi /api chưa được proxy => không phải JSON thật, coi là lỗi cấu hình
  if (res.ok && (res.headers.get('content-type') ?? '').includes('text/html')) {
    const e = new ApiError(res.status, 'Server trả về HTML thay vì JSON (kiểm tra proxy / VITE_API_BASE)');
    e.html = true;
    throw e;
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }   // server có thể trả text/plain

  if (!res.ok) {
    if (res.status === 401 && !silent401) onUnauthorized?.();
    throw new ApiError(res.status, data?.message ?? data?.error ?? res.statusText ?? 'Request failed', data);
  }
  return data;
}