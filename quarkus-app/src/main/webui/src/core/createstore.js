import { useEffect, useSyncExternalStore } from 'react';
import { http } from './http.js';
import { useAsyncQuery } from './useasyncquery.js';

// Store dùng API THẬT. Cùng giao diện với store giả lập (mockStore.js):
//   use()               -> tải TOÀN BỘ danh sách (danh mục nhỏ đổ dropdown, module khác đang dùng)
//   useQuery(query)     -> tải THEO TRANG từ server: tìm kiếm, lọc, sắp xếp, phân trang
//   search(q, {limit})  -> Promise<mảng bản ghi> cho ô autocomplete
//   add / update / remove -> Promise, ném HttpError khi server từ chối
//
// Hợp đồng REST (resource = '/suppliers'):
//   GET /suppliers?q=&page=1&pageSize=20&sort=name&dir=asc&<bộ lọc...>  ->  { items: [...], total: 135 }
//        q: tìm không phân biệt hoa/thường/dấu trên các cột chữ (server tự quyết định cột nào)
//        page: bắt đầu từ 1;  total: tổng số bản ghi khớp điều kiện (chưa cắt trang)
//        sort: tên field (riêng vật tư: typeName = sắp theo tên loại);  dir: asc | desc
//        bộ lọc: typeId, priceMin, priceMax, phone=has|none, branch, group
//   GET /suppliers           -> [ ... ] hoặc { items: [...] }   (use(): không kèm tham số)
//   POST   /suppliers        -> 201 + bản ghi vừa tạo (id và code do server cấp)
//   PUT    /suppliers/:id    -> 200 + bản ghi đã cập nhật (hoặc 204)
//   DELETE /suppliers/:id    -> 204
//   Lỗi: 4xx/5xx kèm JSON { "message": "..." }

function buildQS({ q, page = 1, pageSize = 20, sort, filters } = {}) {
  const p = new URLSearchParams();
  if (q && q.trim()) p.set('q', q.trim());
  p.set('page', page);
  p.set('pageSize', pageSize);
  if (sort) { p.set('sort', sort.key); p.set('dir', sort.dir); }
  for (const [k, v] of Object.entries(filters ?? {})) if (v !== '' && v != null) p.set(k, v);
  return p.toString();
}

function normalize(res) {
  if (Array.isArray(res)) return { items: res, total: res.length };
  const items = res?.items ?? res?.data ?? [];
  return { items, total: res?.total ?? res?.count ?? items.length };
}

export function createStore(resource) {
  // ---- Cache toàn bộ danh sách (use) ----
  let st = { items: [], loaded: false, loading: false, error: null };
  let inflight = null;
  let gen = 0;                       // tăng khi reset() để bỏ qua phản hồi của phiên cũ
  const subs = new Set();
  const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
  const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

  // ---- Báo cho các useQuery đang mở biết dữ liệu đã đổi để tải lại ----
  let version = 0;
  const invSubs = new Set();
  const subscribeInv = (f) => { invSubs.add(f); return () => invSubs.delete(f); };
  const invalidate = () => { version += 1; invSubs.forEach((f) => f()); };

  function load() {
    if (inflight) return inflight;   // nhiều component cùng use() chỉ tạo 1 request
    const g = gen;
    set({ loading: true, error: null });
    inflight = http.get(resource)
      .then((res) => { if (g === gen) set({ items: normalize(res).items, loaded: true, loading: false }); })
      .catch((error) => { if (g === gen) set({ loading: false, error }); })
      .finally(() => { inflight = null; });
    return inflight;
  }

  // Không lạc quan: chỉ cập nhật sau khi server xác nhận thành công.
  async function add(fields) {
    const created = await http.post(resource, fields);
    set({ items: [...st.items, created] });
    invalidate();
    return created;
  }

  async function update(id, patch) {
    const res = await http.put(`${resource}/${id}`, patch);
    set({ items: st.items.map((i) => (i.id === id ? (res ?? { ...i, ...patch }) : i)) });
    invalidate();
    return res;
  }

  async function remove(id) {
    await http.delete(`${resource}/${id}`);
    set({ items: st.items.filter((i) => i.id !== id) });
    invalidate();
  }

  // Gọi khi đăng xuất / đổi tài khoản để không lộ dữ liệu của người trước.
  function reset() {
    gen += 1;
    inflight = null;
    set({ items: [], loaded: false, loading: false, error: null });
    invalidate();
  }

  return {
    // Tải toàn bộ danh sách
    use() {
      const s = useSyncExternalStore(subscribe, () => st);
      useEffect(() => { if (!st.loaded && !st.loading && !st.error) load(); }, []);
      return {
        items: s.items,
        loading: (s.loading || !s.loaded) && !s.error,
        error: s.error,
        reload: load,
      };
    },

    // Tải theo trang. query = { q, page, pageSize, sort: { key, dir }, filters: { ... } }
    // options.enabled = false: tạm hoãn gọi (dùng khi đang gõ chờ debounce).
    useQuery(query, { enabled = true } = {}) {
      const qs = buildQS(query);
      const ver = useSyncExternalStore(subscribeInv, () => version);
      const r = useAsyncQuery(
        `${resource}?${qs}`,
        (signal) => http.get(`${resource}?${qs}`, { signal }).then(normalize),
        { enabled, refresh: ver },
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

    // Dùng cho ô autocomplete: gọi server tìm theo q, lấy tối đa `limit` bản ghi
    async search(q, { limit = 20 } = {}) {
      const res = await http.get(`${resource}?${buildQS({ q, page: 1, pageSize: limit })}`);
      return normalize(res).items;
    },

    add, update, remove, load, reset,
    get list() { return st.items; },
  };
}