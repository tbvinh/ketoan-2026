// Chọn nguồn dữ liệu cho toàn bộ master data:
//   VITE_USE_REAL_API=false (hoặc không đặt)  -> API giả (dummy) chạy trong trình duyệt, dùng dữ liệu mẫu
//   VITE_USE_REAL_API=true                    -> API thật qua http.js (fetch tới VITE_API_URL)
//
// Đặt trong .env.local (dev) hoặc .env.production, rồi KHỞI ĐỘNG LẠI dev server (Vite chỉ đọc env lúc khởi động).
// Nếu dùng CRA: đổi thành process.env.REACT_APP_USE_REAL_API.
const raw = import.meta.env?.VITE_USE_REAL_API;

export const USE_REAL_API = ['1', 'true', 'yes'].includes(String(raw ?? '').trim().toLowerCase());