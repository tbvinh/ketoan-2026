import { useSyncExternalStore } from 'react';
import { fakeApi } from './api.js';
import { useAsyncQuery } from './useasyncquery.js';

// Store GIẢ LẬP (dummy API): dữ liệu nằm trong bộ nhớ, có độ trễ như gọi mạng.
// Giao diện giống hệt store API thật (createStore.js): use / useQuery / search / add / update / remove / load / reset.
// add/update/remove trả về Promise (giống API thật) nên nơi gọi cần `await`.

export const mockConfig = {
  failRate: 0,   // 0..1: xác suất add/update/remove/useQuery báo lỗi giả lập (thử 0.3 để xem giao diện báo lỗi)
};

const pad = (n, w) => String(n).padStart(w, '0');
const strip = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const has = (v) => v !== undefined && v !== null && v !== '';

// Các cột chữ mà ô tìm kiếm q quét qua (server thật tự quyết định danh sách này)
const SEARCH_FIELDS = ['code', 'name', 'phone', 'address', 'unit', 'branch'];

// Mô phỏng đúng hợp đồng của server: q, filters, sort, page/pageSize -> { items, total }
//   resolve: hàm tính các trường "ảo" cần join bảng khác, ví dụ resolve.typeName(it)
function queryLocal(items, { q, page = 1, pageSize = 20, sort, filters = {} } = {}, resolve = {}) {
  let rows = items;

  const words = strip(q).trim().split(/\s+/).filter(Boolean);
  if (words.length) {
    rows = rows.filter((it) => {
      const hay = strip([...SEARCH_FIELDS.map((f) => it[f]), resolve.typeName?.(it)].join(' '));
      return words.every((w) => hay.includes(w));
    });
  }

  const f = filters;
  if (has(f.typeId)) rows = rows.filter((it) => String(it.typeId) === String(f.typeId));
  if (has(f.priceMin)) rows = rows.filter((it) => (+it.price || 0) >= +f.priceMin);
  if (has(f.priceMax)) rows = rows.filter((it) => (+it.price || 0) <= +f.priceMax);
  if (f.phone === 'has') rows = rows.filter((it) => String(it.phone ?? '').trim());
  if (f.phone === 'none') rows = rows.filter((it) => !String(it.phone ?? '').trim());
  if (has(f.branch)) rows = rows.filter((it) => strip(it.branch).includes(strip(f.branch)));
  if (has(f.group)) rows = rows.filter((it) => String(it.code ?? '').charAt(0) === String(f.group));

  if (sort?.key) {
    const val = (it) => {
      const v = resolve[sort.key] ? resolve[sort.key](it) : it[sort.key];
      return typeof v === 'number' ? v : strip(v);
    };
    const dir = sort.dir === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
  }

  const start = (Math.max(1, page) - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), total: rows.length };
}

export function createMockStore(prefix, seed) {
  let st = { items: [], loading: false, version: 0 };   // version tăng sau thêm/sửa/xóa để useQuery tải lại
  const subs = new Set();
  const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
  const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
  const resolve = {};   // gán resolve.typeName = (item) => ... từ bên ngoài nếu cần join bảng khác

  function load() {
    set({ loading: true });
    return fakeApi(seed, 400).then((items) => set({ items, loading: false }));
  }
  const ready = load();   // như bản cũ: nạp dữ liệu mẫu ngay khi tạo store

  const maybeFail = () => { if (Math.random() < mockConfig.failRate) throw new Error('Lỗi mạng (giả lập)'); };

  function nextCode() {
    const used = new Set(st.items.map((i) => i.code));
    let n = st.items.length + 1;
    while (used.has(prefix + pad(n, 4))) n += 1;
    return prefix + pad(n, 4);
  }

  async function add(fields) {
    await fakeApi(null, 300);
    maybeFail();
    const item = { ...fields, id: Date.now() + Math.random() };
    // Form "Thêm mới" gửi code = '' -> tự sinh mã; nếu người dùng nhập mã thì giữ nguyên
    if (!String(item.code ?? '').trim()) item.code = nextCode();
    set({ items: [...st.items, item], version: st.version + 1 });
    return item;
  }

  async function update(id, patch) {
    await fakeApi(null, 300);
    maybeFail();
    const cur = st.items.find((i) => i.id === id);
    if (!cur) throw new Error('Không tìm thấy bản ghi');
    const updated = { ...cur, ...patch, id };
    set({ items: st.items.map((i) => (i.id === id ? updated : i)), version: st.version + 1 });
    return updated;
  }

  async function remove(id) {
    await fakeApi(null, 300);
    maybeFail();
    if (!st.items.some((i) => i.id === id)) throw new Error('Không tìm thấy bản ghi');
    set({ items: st.items.filter((i) => i.id !== id), version: st.version + 1 });
  }

  // Giống store thật: xóa cache. Ở chế độ giả lập thì nạp lại dữ liệu mẫu.
  function reset() {
    set({ items: [] });
    return load().then(() => set({ version: st.version + 1 }));
  }

  return {
    // Toàn bộ danh sách
    use() {
      const s = useSyncExternalStore(subscribe, () => st);
      return { items: s.items, loading: s.loading, error: null, reload: load };
    },

    // Tải theo trang, mô phỏng server. Cùng hình dạng với store thật.
    useQuery(query, { enabled = true } = {}) {
      const s = useSyncExternalStore(subscribe, () => st);
      const r = useAsyncQuery(
        `${prefix}?${JSON.stringify(query)}`,
        async () => {
          await ready;
          await fakeApi(null, 250);
          maybeFail();
          return queryLocal(st.items, query, resolve);
        },
        { enabled, refresh: s.version },
      );
      return {
        items: r.data?.items ?? [],
        total: r.data?.total ?? 0,
        loading: r.loading,
        fetching: r.fetching,
        error: r.error,
        reload: r.reload,
      };
    },

    // Dùng cho ô autocomplete: trả về tối đa `limit` bản ghi khớp q
    async search(q, { limit = 20 } = {}) {
      await ready;
      return fakeApi(queryLocal(st.items, { q, page: 1, pageSize: limit }, resolve).items, 350);
    },

    add, update, remove, load, reset, resolve,
    get list() { return st.items; },
  };
}