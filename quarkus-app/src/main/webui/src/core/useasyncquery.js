import { useEffect, useState } from 'react';

// Hook chung cho useQuery của cả store giả lập lẫn store API thật, để hai chế độ hành xử GIỐNG HỆT nhau.
//   key      : chuỗi định danh truy vấn; đổi key -> tải lại
//   fetcher  : (signal) => Promise<data>
//   enabled  : false -> hoãn gọi (ví dụ đang chờ debounce)
//   refresh  : giá trị bất kỳ; đổi giá trị -> tải lại (dùng khi dữ liệu bị thay đổi bởi thêm/sửa/xóa)
// Trả về: data, error, fetching (đang tải bất kỳ lúc nào), loading (lần tải đầu, chưa có gì để hiện), reload
export function useAsyncQuery(key, fetcher, { enabled = true, refresh } = {}) {
  const [nonce, setNonce] = useState(0);
  const [s, setS] = useState({ key: null, data: null, error: null, errorKey: null, loading: false });

  useEffect(() => {
    if (!enabled) return undefined;
    const ctrl = new AbortController();          // huỷ request cũ khi query đổi nhanh
    setS((p) => ({ ...p, loading: true, error: null, errorKey: null }));
    Promise.resolve()
      .then(() => fetcher(ctrl.signal))
      .then((data) => { if (!ctrl.signal.aborted) setS({ key, data, error: null, errorKey: null, loading: false }); })
      .catch((error) => {
        if (ctrl.signal.aborted || error?.name === 'AbortError') return;
        setS((p) => ({ ...p, loading: false, error, errorKey: key }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh, nonce, enabled]);

  const settled = s.key === key || s.errorKey === key;
  const fetching = s.loading || !settled;
  const error = s.errorKey === key ? s.error : null;
  return {
    data: s.data,
    error,
    fetching,
    loading: !s.data && fetching && !error,
    reload: () => setNonce((n) => n + 1),
  };
}