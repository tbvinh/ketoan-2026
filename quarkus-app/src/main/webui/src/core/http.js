// HTTP client mỏng bọc fetch: gắn token, parse JSON, ném HttpError thống nhất.
// Vite: đặt VITE_API_URL trong .env (mặc định '/api'). CRA: đổi thành process.env.REACT_APP_API_URL.
const BASE = import.meta.env?.VITE_API_URL ?? '/api';

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;     // 0 = lỗi mạng, 401 = chưa đăng nhập, 409/422 = dữ liệu không hợp lệ...
    this.details = details;   // body lỗi từ server (ví dụ lỗi theo từng field)
  }
}

// Nơi lấy token và xử lý khi hết phiên: chỉnh cho khớp cách đăng nhập của app.
let getToken = () => localStorage.getItem('token');
let onUnauthorized = () => {};
export const configureHttp = (opts) => {
  if (opts.getToken) getToken = opts.getToken;
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized;   // ví dụ: () => { logout(); navigate('/login'); }
};

async function request(method, path, { body, signal } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Nếu dùng cookie httpOnly thay cho token: bỏ Authorization ở trên và thêm  credentials: 'include'
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new HttpError(0, 'Không kết nối được máy chủ');
  }

  if (res.status === 401) onUnauthorized();
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HttpError(res.status, data?.message ?? data?.error ?? res.statusText, data);
  return data;
}

export const http = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
};