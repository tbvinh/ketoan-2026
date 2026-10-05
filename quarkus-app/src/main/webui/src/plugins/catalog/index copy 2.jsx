import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';
import { useConfirm } from '../../core/confirm.jsx';
import {
  suppliersStore, customersStore, banksStore, materialTypesStore, materialsStore, accountsStore, vnd,
} from '../../core/masterdata.js';

const CATS = [
  { id: 'suppliers', icon: '🚚', store: suppliersStore },
  { id: 'customers', icon: '🧑‍💼', store: customersStore },
  { id: 'materials', icon: '📦', store: materialsStore },
  { id: 'materialTypes', icon: '🏷️', store: materialTypesStore },
  { id: 'banks', icon: '🏦', store: banksStore },
  { id: 'accounts', icon: '📒', store: accountsStore },
];

const messages = {
  vi: {
    'cat.title': 'Danh mục', 'cat.suppliers': 'Nhà cung cấp', 'cat.customers': 'Khách hàng', 'cat.materials': 'Vật tư',
    'cat.materialTypes': 'Loại vật tư', 'cat.banks': 'Ngân hàng', 'cat.accounts': 'Tài khoản kế toán',
    'cat.code': 'Mã', 'cat.name': 'Tên', 'cat.phone': 'Điện thoại', 'cat.address': 'Địa chỉ',
    'cat.bankCode': 'Mã NH', 'cat.branch': 'Chi nhánh', 'cat.unit': 'Đơn vị tính', 'cat.price': 'Đơn giá', 'cat.type': 'Loại vật tư',
    'cat.accCode': 'Số hiệu TK', 'cat.new': 'Thêm mới', 'cat.edit': 'Sửa', 'cat.save': 'Lưu', 'cat.cancel': 'Hủy',
    'cat.empty': 'Chưa có dữ liệu.', 'cat.newType': 'Thêm loại vật tư mới',
    // --- tìm kiếm / lọc / sắp xếp ---
    'cat.search': 'Tìm theo mã, tên, địa chỉ…', 'cat.all': 'Tất cả', 'cat.clear': 'Xóa bộ lọc',
    'cat.noResult': 'Không có kết quả phù hợp.', 'cat.count': '{n} / {total} mục',
    'cat.priceFrom': 'Giá từ', 'cat.priceTo': 'Giá đến', 'cat.hasPhone': 'Có điện thoại', 'cat.noPhone': 'Chưa có điện thoại',
    'cat.accGroup': 'Nhóm TK', 'cat.filters': 'Bộ lọc',
    'cat.perPage': 'Dòng/trang', 'cat.pageOf': 'Trang {p} / {n}', 'cat.first': 'Trang đầu', 'cat.prev': 'Trang trước', 'cat.next': 'Trang sau', 'cat.last': 'Trang cuối',
    'cat.delete': 'Xóa', 'cat.confirmDelete': 'Bạn có chắc muốn xóa "{name}"? Thao tác này không thể hoàn tác.',
  },
  en: {
    'cat.title': 'Master Data', 'cat.suppliers': 'Suppliers', 'cat.customers': 'Customers', 'cat.materials': 'Materials',
    'cat.materialTypes': 'Material Types', 'cat.banks': 'Banks', 'cat.accounts': 'Accounting Accounts',
    'cat.code': 'Code', 'cat.name': 'Name', 'cat.phone': 'Phone', 'cat.address': 'Address',
    'cat.bankCode': 'Bank code', 'cat.branch': 'Branch', 'cat.unit': 'Unit', 'cat.price': 'Price', 'cat.type': 'Material type',
    'cat.accCode': 'Account no.', 'cat.new': 'Add new', 'cat.edit': 'Edit', 'cat.save': 'Save', 'cat.cancel': 'Cancel',
    'cat.empty': 'No data yet.', 'cat.newType': 'Add new material type',
    'cat.search': 'Search by code, name, address…', 'cat.all': 'All', 'cat.clear': 'Clear filters',
    'cat.noResult': 'No matching results.', 'cat.count': '{n} / {total} items',
    'cat.priceFrom': 'Price from', 'cat.priceTo': 'Price to', 'cat.hasPhone': 'Has phone', 'cat.noPhone': 'No phone',
    'cat.accGroup': 'Account group', 'cat.filters': 'Filters',
    'cat.perPage': 'Rows/page', 'cat.pageOf': 'Page {p} / {n}', 'cat.first': 'First page', 'cat.prev': 'Previous page', 'cat.next': 'Next page', 'cat.last': 'Last page',
    'cat.delete': 'Delete', 'cat.confirmDelete': 'Are you sure you want to delete "{name}"? This cannot be undone.',
  },
};

/* ---------- Tiện ích tìm kiếm / lọc / sắp xếp ---------- */

// Bỏ dấu tiếng Việt + về chữ thường: "Nhà cung cấp" -> "nha cung cap"
const norm = (s) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase().trim();

// Chuỗi tìm kiếm của 1 dòng: gộp cả giá trị gốc và giá trị hiển thị của mọi cột.
const searchText = (it, schema) =>
  norm(schema.map((f) => [it[f.key], f.display ? f.display(it) : ''].join(' ')).join(' '));

// Mọi từ khóa (cách nhau bởi khoảng trắng) đều phải xuất hiện -> "nguyen hcm" khớp "Nguyễn ... HCM".
const matchQuery = (it, schema, q) => {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = searchText(it, schema);
  return words.every((w) => hay.includes(w));
};

const uniq = (arr) => [...new Set(arr.filter((v) => v !== '' && v != null))];

// Bộ lọc riêng cho từng danh mục.
//   kind 'select': options(items) -> [{ value, label }]
//   kind 'number': ô nhập số
//   test(item, value): true nếu dòng thỏa bộ lọc (chỉ gọi khi value khác rỗng)
function filtersFor(id, t, types) {
  if (id === 'materials') return [
    { key: 'typeId', kind: 'select', label: t('cat.type'),
      options: () => types.map((x) => ({ value: x.id, label: x.name })),
      test: (it, v) => String(it.typeId) === String(v) },
    { key: 'priceMin', kind: 'number', label: t('cat.priceFrom'), test: (it, v) => (+it.price || 0) >= +v },
    { key: 'priceMax', kind: 'number', label: t('cat.priceTo'), test: (it, v) => (+it.price || 0) <= +v },
  ];
  if (id === 'suppliers' || id === 'customers') return [
    { key: 'phone', kind: 'select', label: t('cat.phone'),
      options: () => [{ value: 'has', label: t('cat.hasPhone') }, { value: 'none', label: t('cat.noPhone') }],
      test: (it, v) => (v === 'has' ? !!String(it.phone ?? '').trim() : !String(it.phone ?? '').trim()) },
  ];
  if (id === 'banks') return [
    { key: 'branch', kind: 'select', label: t('cat.branch'),
      options: (items) => uniq(items.map((x) => x.branch)).sort().map((b) => ({ value: b, label: b })),
      test: (it, v) => it.branch === v },
  ];
  if (id === 'accounts') return [
    // Nhóm tài khoản theo chữ số đầu của số hiệu: 1xx, 2xx, 3xx…
    { key: 'group', kind: 'select', label: t('cat.accGroup'),
      options: (items) => uniq(items.map((x) => String(x.code ?? '').charAt(0))).sort().map((g) => ({ value: g, label: g + 'xx' })),
      test: (it, v) => String(it.code ?? '').charAt(0) === v },
  ];
  return []; // materialTypes: chỉ tìm kiếm
}

// Giá trị dùng để sắp xếp của một cột.
const sortValue = (it, f) => (f.type === 'number' ? +it[f.key] || 0 : f.display ? norm(f.display(it)) : norm(it[f.key]));

function applyAll(items, schema, filters, q, sort, filterDefs) {
  let out = items.filter((it) => matchQuery(it, schema, q));
  for (const fd of filterDefs) {
    const v = filters[fd.key];
    if (v !== undefined && v !== '' && v !== null) out = out.filter((it) => fd.test(it, v));
  }
  if (sort) {
    const f = schema.find((s) => s.key === sort.key);
    if (f) {
      const dir = sort.dir === 'desc' ? -1 : 1;
      out = [...out].sort((a, b) => {
        const x = sortValue(a, f), y = sortValue(b, f);
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
    }
  }
  return out;
}

const EMPTY_VIEW = { q: '', filters: {}, sort: null, page: 1 };
const PAGE_SIZES = [10, 20, 50, 100];

/* ---------- Cấu hình cột ---------- */

// Cấu hình cột theo từng danh mục. materials có thêm cột "Loại vật tư" cho phép
// chọn từ danh sách hoặc bấm ➕ để tự thêm loại mới ngay tại chỗ.
function schemaFor(id, t, types) {
  if (id === 'materials') return [
    { key: 'code', label: t('cat.code') },
    { key: 'name', label: t('cat.name') },
    { key: 'unit', label: t('cat.unit') },
    { key: 'price', label: t('cat.price'), type: 'number', display: (it) => vnd(it.price) },
    { key: 'typeId', label: t('cat.type'),
      display: (it) => types.find((x) => x.id === it.typeId)?.name ?? '',
      render: (editing, update) => (
        <div className="typerow">
          <select value={editing.typeId ?? ''} onChange={(e) => update({ typeId: e.target.value })}>
            <option value="">--</option>
            {types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <button type="button" className="tb" title={t('cat.newType')} onClick={() => {
            const n = prompt(t('cat.newType') + '?'); if (n) { const created = materialTypesStore.add({ name: n }); update({ typeId: created.id }); }
          }}>➕</button>
        </div>) },
  ];
  if (id === 'materialTypes') return [{ key: 'name', label: t('cat.name') }];
  if (id === 'banks') return [{ key: 'code', label: t('cat.bankCode') }, { key: 'name', label: t('cat.name') }, { key: 'branch', label: t('cat.branch') }];
  if (id === 'accounts') return [{ key: 'code', label: t('cat.accCode') }, { key: 'name', label: t('cat.name') }];
  return [{ key: 'code', label: t('cat.code') }, { key: 'name', label: t('cat.name') }, { key: 'phone', label: t('cat.phone') }, { key: 'address', label: t('cat.address') }]; // suppliers/customers
}

/* ---------- Giao diện ---------- */

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('cat.title')}</h3>
    {CATS.map((c) => (
      <button key={c.id} className={'item' + (state.category === c.id ? ' on' : '')}
        // Đổi danh mục -> reset tìm kiếm / bộ lọc / sắp xếp vì mỗi danh mục có cột khác nhau
        onClick={() => setState({ category: c.id, editing: null, ...EMPTY_VIEW })}>{c.icon} {t('cat.' + c.id)}</button>
    ))}
  </>);
}

function Toolbar({ state, setState, filterDefs, items, shown, total }) {
  const { t } = useI18n();
  const q = state.q ?? '';
  const filters = state.filters ?? {};
  const active = !!q || filterDefs.some((f) => filters[f.key] !== undefined && filters[f.key] !== '') ;
  const setFilter = (key, value) => setState({ filters: { ...filters, [key]: value }, page: 1 }, { replace: true });

  return (
    <div className="cattools">
      <div className="searchbox">
        <span aria-hidden="true">🔍</span>
        <input type="search" value={q} placeholder={t('cat.search')} aria-label={t('cat.search')}
          onChange={(e) => setState({ q: e.target.value, page: 1 }, { replace: true })} />
        {q && <button type="button" className="xbtn" title={t('cat.clear')} onClick={() => setState({ q: '', page: 1 }, { replace: true })}>✕</button>}
      </div>

      {filterDefs.map((f) => (
        <label key={f.key} className="filter">
          <span>{f.label}</span>
          {f.kind === 'select' ? (
            <select value={filters[f.key] ?? ''} onChange={(e) => setFilter(f.key, e.target.value)}>
              <option value="">{t('cat.all')}</option>
              {f.options(items).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type="number" min="0" value={filters[f.key] ?? ''} onChange={(e) => setFilter(f.key, e.target.value)} />
          )}
        </label>
      ))}

      {active && <button type="button" className="tb" onClick={() => setState(EMPTY_VIEW, { replace: true })}>✕ {t('cat.clear')}</button>}
      <span className="catcount">{t('cat.count').replace('{n}', shown).replace('{total}', total)}</span>
    </div>
  );
}

function Pager({ page, totalPages, pageSize, setState }) {
  const { t } = useI18n();
  const go = (p) => setState({ page: Math.min(Math.max(1, p), totalPages) }, { replace: true });
  return (
    <div className="pager">
      <label className="filter perpage">
        <span>{t('cat.perPage')}</span>
        <select value={pageSize} onChange={(e) => setState({ pageSize: +e.target.value, page: 1 }, { replace: true })}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <div className="pagenav">
        <button type="button" className="tb" title={t('cat.first')} aria-label={t('cat.first')} disabled={page <= 1} onClick={() => go(1)}>⏮</button>
        <button type="button" className="tb" title={t('cat.prev')} aria-label={t('cat.prev')} disabled={page <= 1} onClick={() => go(page - 1)}>◀</button>
        <span className="pageinfo" aria-live="polite">{t('cat.pageOf').replace('{p}', page).replace('{n}', totalPages)}</span>
        <button type="button" className="tb" title={t('cat.next')} aria-label={t('cat.next')} disabled={page >= totalPages} onClick={() => go(page + 1)}>▶</button>
        <button type="button" className="tb" title={t('cat.last')} aria-label={t('cat.last')} disabled={page >= totalPages} onClick={() => go(totalPages)}>⏭</button>
      </div>
    </div>
  );
}

function View({ state, setState, can }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  if (!can('catalog', 'read')) return <Denied />;
  const cat = CATS.find((c) => c.id === state.category);
  const { items, loading } = cat.store.use();
  const types = materialTypesStore.use().items;   // luôn gọi để giữ số lượng hook ổn định giữa các danh mục
  if (loading) return <Loading />;

  const schema = schemaFor(cat.id, t, types);
  const filterDefs = filtersFor(cat.id, t, types);
  const editing = state.editing;

  if (editing) {
    const savePerm = editing.id ? can('catalog', 'update') : can('catalog', 'create');
    return (
      <div className="pad">
        <h2>{editing.id ? t('cat.edit') : t('cat.new')} — {t('cat.' + cat.id)}</h2>
        <div className="invmaster">
          {schema.map((f) => (
            <label key={f.key}>{f.label}
              {f.render ? f.render(editing, (patch) => setState({ editing: { ...editing, ...patch } }, { replace: true }))
                : <input type={f.type ?? 'text'} value={editing[f.key] ?? ''}
                    onChange={(e) => setState({ editing: { ...editing, [f.key]: f.type === 'number' ? (+e.target.value || 0) : e.target.value } }, { replace: true })} />}
            </label>
          ))}
        </div>
        <div className="formActions">
          <button className="btn" disabled={!savePerm} onClick={() => {
            if (editing.id) cat.store.update(editing.id, editing); else cat.store.add(editing);
            setState({ editing: null });
          }}>{t('cat.save')}</button>
          <button className="tb" onClick={() => setState({ editing: null })}>{t('cat.cancel')}</button>
        </div>
      </div>
    );
  }

  // Lọc + tìm kiếm + sắp xếp (state.q / state.filters / state.sort được giữ khi mở form sửa rồi quay lại)
  const q = state.q ?? '';
  const filters = state.filters ?? {};
  const sort = state.sort ?? null;
  const rows = applyAll(items, schema, filters, q, sort, filterDefs);

  // Phân trang: kẹp lại số trang phòng khi xóa bớt dòng làm trang hiện tại không còn
  const pageSize = state.pageSize ?? PAGE_SIZES[1];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, state.page ?? 1), totalPages);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  // Bấm tiêu đề cột: tăng dần -> giảm dần -> bỏ sắp xếp
  const toggleSort = (key) => {
    const next = !sort || sort.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
    setState({ sort: next, page: 1 }, { replace: true });
  };

  return (
    <div className="pad">
      <div className="ghead">
        <h2>{t('cat.' + cat.id)}</h2>
        {can('catalog', 'create') && <button className="tb" onClick={() => setState({ editing: schema.reduce((o, f) => ({ ...o, [f.key]: '' }), {}) })}>➕ {t('cat.new')}</button>}
      </div>

      <Toolbar state={state} setState={setState} filterDefs={filterDefs} items={items} shown={rows.length} total={items.length} />

      <table className="invtable">
        <thead>
          <tr>
            {schema.map((f) => {
              const on = sort?.key === f.key;
              return (
                <th key={f.key} className="sortable" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="thbtn" onClick={() => toggleSort(f.key)}>
                    {f.label}<span className="sortmark">{on ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              );
            })}
            <th />
          </tr>
        </thead>
        <tbody>
          {pageRows.map((it) => (
            <tr key={it.id}>
              {schema.map((f) => <td key={f.key}>{f.display ? f.display(it) : it[f.key]}</td>)}
              <td>
                {can('catalog', 'update') && <button className="xbtn" onClick={() => setState({ editing: { ...it } })}>✏️</button>}
                {can('catalog', 'delete') && (
                  <button className="xbtn" title={t('cat.delete')} aria-label={t('cat.delete')} onClick={async () => {
                    const label = it.name || it.code || '';
                    if (await confirm(t('cat.confirmDelete').replace('{name}', label))) cat.store.remove(it.id);
                  }}>🗑</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={schema.length + 1} className="empty">{items.length ? t('cat.noResult') : t('cat.empty')}</td></tr>
          )}
        </tbody>
      </table>

      {rows.length > 0 && <Pager page={page} totalPages={totalPages} pageSize={pageSize} setState={setState} />}
    </div>
  );
}

export default { id: 'catalog', title: 'cat.title', icon: '🗂️', order: 6, messages,
  initialState: { category: 'suppliers', editing: null, pageSize: 20, ...EMPTY_VIEW }, Menu, View };

/* ---------- CSS gợi ý (thêm vào file style chung của app) ----------

.cattools { display: flex; flex-wrap: wrap; align-items: end; gap: 10px 14px; margin: 8px 0 12px; }
.searchbox { display: flex; align-items: center; gap: 6px; min-width: 240px; flex: 1 1 260px; max-width: 420px;
  padding: 4px 8px; border: 1px solid var(--border, #d0d5dd); border-radius: 6px; background: var(--bg, #fff); }
.searchbox input { flex: 1; border: 0; outline: 0; background: transparent; font: inherit; padding: 4px 0; }
.searchbox:focus-within { border-color: var(--accent, #0f6cbd); box-shadow: 0 0 0 2px rgba(15,108,189,.2); }
.filter { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--muted, #667085); }
.filter select, .filter input { font: inherit; font-size: 13px; padding: 4px 6px; min-width: 120px; }
.catcount { margin-left: auto; font-size: 12px; color: var(--muted, #667085); }
.invtable th.sortable { padding: 0; }
.thbtn { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 6px 8px; cursor: pointer; font-weight: inherit; }
.thbtn:hover, .thbtn:focus-visible { background: rgba(0,0,0,.05); }
.sortmark { font-size: 10px; }
.pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.pagenav { display: flex; align-items: center; gap: 6px; }
.pagenav .tb:disabled { opacity: .4; cursor: default; }
.pageinfo { min-width: 90px; text-align: center; font-size: 13px; }
.perpage { flex-direction: row; align-items: center; gap: 6px; }

*/
