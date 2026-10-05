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
