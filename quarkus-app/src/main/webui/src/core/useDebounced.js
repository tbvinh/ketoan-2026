import { useEffect, useState } from 'react';

// Trì hoãn giá trị để không gọi API mỗi lần gõ phím (dùng chung cho catalog + inventory).
// Trước đây mỗi plugin copy 1 bản — xem RULES.md FE-PL16.
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default useDebounced;
