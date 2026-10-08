import { useEffect, useState } from 'react';
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
    'cat.search': 'Tìm theo mã, tên, địa chỉ…', 'cat.all': 'Tất cả', 'cat.clear': 'Xóa bộ lọc',
    'cat.noResult': 'Không có kết quả phù hợp.', 'cat.range': 'Hiển thị {from}–{to} / {total}',
    'cat.priceFrom': 'Giá từ', 'cat.priceTo': 'Giá đến', 'cat.hasPhone': 'Có điện thoại', 'cat.noPhone': 'Chưa có điện thoại',
    'cat.accGroup': 'Nhóm TK',
    'cat.saving': 'Đang lưu…', 'cat.saveFailed': 'Không thể lưu', 'cat.deleteFailed': 'Không thể xóa', 'cat.loadFailed': 'Không tải được dữ liệu', 'cat.retry': 'Thử lại',
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
    'cat.noResult': 'No matching results.', 'cat.range': 'Showing {from}–{to} of {total}',
    'cat.priceFrom': 'Price from', 'cat.priceTo': 'Price to', 'cat.hasPhone': 'Has phone', 'cat.noPhone': 'No phone',
    'cat.accGroup': 'Account group',
    'cat.saving': 'Saving…', 'cat.saveFailed': 'Could not save', 'cat.deleteFailed': 'Could not delete', 'cat.loadFailed': 'Could not load data', 'cat.retry': 'Retry',
    'cat.perPage': 'Rows/page', 'cat.pageOf': 'Page {p} / {n}', 'cat.first': 'First page', 'cat.prev': 'Previous page', 'cat.next': 'Next page', 'cat.last': 'Last page',
    'cat.delete': 'Delete', 'cat.confirmDelete': 'Are you sure you want to delete "{name}"? This cannot be undone.',
  },
};

/* ---------- Trạng thái tìm kiếm / lọc / sắp xếp / phân trang ---------- */

const NO_FILTERS = {};   // hằng số module để tham chiếu không đổi giữa các lần render
const EMPTY_VIEW = { q: '', filters: NO_FILTERS, sort: null, page: 1 };
const PAGE_SIZES = [5, 10, 20, 50, 100];

// Bộ lọc gửi thẳng lên server dưới dạng query string: ?typeId=..&priceMin=..
//   kind: 'select' (options tĩnh) | 'number' | 'text'
function filtersFor(id, t, types) {
  if (id === 'materials') return [
    { key: 'typeId', kind: 'select', label: t('cat.type'), options: types.map((x) => ({ value: x.id, label: x.name })) },
    { key: 'priceMin', kind: 'number', label: t('cat.priceFrom') },
    { key: 'priceMax', kind: 'number', label: t('cat.priceTo') },
  ];
  if (id === 'suppliers' || id === 'customers') return [
    { key: 'phone', kind: 'select', label: t('cat.phone'),
      options: [{ value: 'has', label: t('cat.hasPhone') }, { value: 'none', label: t('cat.noPhone') }] },
  ];
  if (id === 'banks') return [{ key: 'branch', kind: 'text', label: t('cat.branch') }];
  if (id === 'accounts') return [
    // Nhóm tài khoản theo chữ số đầu của số hiệu: 1xx … 9xx
    { key: 'group', kind: 'select', label: t('cat.accGroup'),
      options: '123456789'.split('').map((g) => ({ value: g, label: g + 'xx' })) },
  ];
  return []; // materialTypes: chỉ tìm kiếm
}

// Trì hoãn giá trị để không gọi API mỗi lần gõ phím.
function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/* ---------- Cấu hình cột ---------- */

// sortKey: tên field gửi lên server khi sắp xếp (mặc định = key). Riêng "Loại vật tư" sắp theo tên loại.
function schemaFor(id, t, types) {
  if (id === 'materials') return [
    { key: 'code', label: t('cat.code') },
    { key: 'name', label: t('cat.name') },
    { key: 'unit', label: t('cat.unit') },
    { key: 'price', label: t('cat.price'), type: 'number', display: (it) => vnd(it.price) },
    { key: 'typeId', label: t('cat.type'), sortKey: 'typeName',
      display: (it) => types.find((x) => x.id === it.typeId)?.name ?? '',
      render: (editing, update) => (
        <div className="typerow">
          <select value={editing.typeId ?? ''} onChange={(e) => update({ typeId: e.target.value })}>
            <option value="">--</option>
            {types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <button type="button" className="tb" title={t('cat.newType')} onClick={async () => {
            const n = prompt(t('cat.newType') + '?');
            if (n) { try { const created = await materialTypesStore.add({ name: n }); update({ typeId: created.id }); } catch (e) { alert(t('cat.saveFailed') + ': ' + e.message); } }
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
        // Đổi danh mục -> reset tìm kiếm / bộ lọc / sắp xếp / trang vì mỗi danh mục có cột khác nhau
        onClick={() => setState({ category: c.id, editing: null, error: null, ...EMPTY_VIEW })}>{c.icon} {t('cat.' + c.id)}</button>
    ))}
  </>);
}
const ribbon = ({ setState, can }) => ({
  tabs: [{ id: 'catalog', title: 'cat.title', groups: [{ id: 'new', title: 'cat.newGroup', items: [
    { id: 'new-import', icon: '📥', label: 'cat.newImport', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('import') }) },
    { id: 'new-export', icon: '📤', label: 'cat.newExport', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('export') }) },
    { id: 'new-return', icon: '↩️', label: 'cat.newReturn', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('return') }) },
  ] }] }],
});

function Toolbar({ state, setState, filterDefs, countLabel, fetching }) {
  const { t } = useI18n();
  const q = state.q ?? '';
  const filters = state.filters ?? NO_FILTERS;
  const active = !!q || filterDefs.some((f) => filters[f.key] !== undefined && filters[f.key] !== '');
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
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.kind === 'number' ? 'number' : 'text'} min={f.kind === 'number' ? '0' : undefined}
              value={filters[f.key] ?? ''} onChange={(e) => setFilter(f.key, e.target.value)} />
          )}
        </label>
      ))}

      {active && <button type="button" className="tb" onClick={() => setState(EMPTY_VIEW, { replace: true })}>✕ {t('cat.clear')}</button>}
      <span className="catcount" aria-live="polite">{fetching ? '⏳ ' : ''}{countLabel}</span>
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

// Toàn bộ hook nằm ở đây; View chỉ kiểm tra quyền rồi mới mount Body (nên không vi phạm thứ tự hook).
function Body({ state, setState, can }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const cat = CATS.find((c) => c.id === state.category);
  const types = materialTypesStore.use().items;   // danh sách nhỏ, tải đủ để đổ dropdown và hiển thị tên loại

  const q = state.q ?? '';
  const filters = state.filters ?? NO_FILTERS;
  const sort = state.sort ?? null;
  const pageSize = state.pageSize ?? PAGE_SIZES[1];
  const page = Math.max(1, state.page ?? 1);

  // Debounce tìm kiếm + bộ lọc (so sánh bằng chuỗi nên không lệch tham chiếu).
  // Trong lúc chờ debounce thì hoãn gọi API (enabled=false) để không bắn request thừa khi vừa gõ vừa về trang 1.
  const critKey = JSON.stringify({ q, filters });
  const settledKey = useDebounced(critKey, 300);
  const settled = JSON.parse(settledKey);
  const { items, total, loading, fetching, error: loadError, reload } = cat.store.useQuery(
    { q: settled.q, filters: settled.filters, page, pageSize, sort },
    { enabled: critKey === settledKey },
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Nếu xóa hết dòng ở trang cuối (hoặc dữ liệu co lại) thì lùi về trang cuối còn dữ liệu
  useEffect(() => {
    if (!fetching && total > 0 && page > totalPages) setState({ page: totalPages }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetching, total, page, totalPages]);

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
        {state.error && <p className="formError" role="alert">{t('cat.saveFailed')}: {state.error}</p>}
        <div className="formActions">
          <button className="btn" disabled={!savePerm || state.saving} onClick={async () => {
            setState({ saving: true, error: null }, { replace: true });
            try {
              if (editing.id) await cat.store.update(editing.id, editing); else await cat.store.add(editing);
              setState({ editing: null, saving: false });
            } catch (e) {
              setState({ saving: false, error: e.message }, { replace: true });   // giữ nguyên form để người dùng sửa lại
            }
          }}>{state.saving ? t('cat.saving') : t('cat.save')}</button>
          <button className="tb" disabled={state.saving} onClick={() => setState({ editing: null, error: null })}>{t('cat.cancel')}</button>
        </div>
      </div>
    );
  }

  // Bấm tiêu đề cột: tăng dần -> giảm dần -> bỏ sắp xếp (server sắp xếp trên toàn bộ dữ liệu)
  const toggleSort = (key) => {
    const next = !sort || sort.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
    setState({ sort: next, page: 1 }, { replace: true });
  };

  const from = (page - 1) * pageSize + 1;
  const countLabel = total
    ? t('cat.range').replace('{from}', from).replace('{to}', from + items.length - 1).replace('{total}', total)
    : '';
  const hasCriteria = !!q || Object.values(filters).some((v) => v !== '' && v != null);

  return (
    <div className="pad">
      <div className="ghead">
        <h2>{t('cat.' + cat.id)}</h2>
        {can('catalog', 'create') && <button className="tb" onClick={() => setState({ editing: schema.reduce((o, f) => ({ ...o, [f.key]: '' }), {}), error: null })}>➕ {t('cat.new')}</button>}
      </div>

      {state.error && <p className="formError" role="alert">{state.error}</p>}
      {loadError && (
        <p className="formError" role="alert">
          {t('cat.loadFailed')}: {loadError.message} <button type="button" className="tb" onClick={reload}>{t('cat.retry')}</button>
        </p>
      )}

      <Toolbar state={state} setState={setState} filterDefs={filterDefs} countLabel={countLabel} fetching={fetching} />

      <table className={'invtable' + (fetching ? ' fetching' : '')} aria-busy={fetching}>
        <thead>
          <tr>
            {schema.map((f) => {
              const sk = f.sortKey ?? f.key;
              const on = sort?.key === sk;
              return (
                <th key={f.key} className="sortable" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="thbtn" onClick={() => toggleSort(sk)}>
                    {f.label}<span className="sortmark">{on ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              );
            })}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className={state.busyId === it.id ? 'busy' : undefined} aria-busy={state.busyId === it.id}>
              {schema.map((f) => <td key={f.key}>{f.display ? f.display(it) : it[f.key]}</td>)}
              <td>
                {can('catalog', 'update') && <button className="xbtn" onClick={() => setState({ editing: { ...it }, error: null })}>✏️</button>}
                {can('catalog', 'delete') && (
                  <button className="xbtn" disabled={state.busyId === it.id} title={t('cat.delete')} aria-label={t('cat.delete')} onClick={async () => {
                    const label = it.name || it.code || '';
                    if (!(await confirm(t('cat.confirmDelete').replace('{name}', label)))) return;
                    setState({ busyId: it.id, error: null }, { replace: true });
                    try {
                      await cat.store.remove(it.id);
                      setState({ busyId: null }, { replace: true });
                    } catch (e) {
                      setState({ busyId: null, error: t('cat.deleteFailed') + ': ' + e.message }, { replace: true });
                    }
                  }}>🗑</button>
                )}
              </td>
            </tr>
          ))}
          {!items.length && !fetching && (
            <tr><td colSpan={schema.length + 1} className="empty">
              {loadError ? t('cat.loadFailed') : hasCriteria ? t('cat.noResult') : t('cat.empty')}
            </td></tr>
          )}
        </tbody>
      </table>

      {total > 0 && <Pager page={page} totalPages={totalPages} pageSize={pageSize} setState={setState} />}
    </div>
  );
}

function View(props) {
  if (!props.can('catalog', 'read')) return <Denied />;
  // key theo danh mục: đổi danh mục thì mount lại Body, không lẫn dữ liệu giữa các danh mục
  return <Body key={props.state.category} {...props} />;
}

export default { id: 'catalog', title: 'cat.title', icon: '🗂️', order: 6, messages,
  initialState: { category: 'suppliers', editing: null, saving: false, error: null, busyId: null, pageSize: 5, ...EMPTY_VIEW },
  Menu, ribbon, View };

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
.formError { margin: 8px 0; padding: 8px 10px; border-radius: 6px; background: #fdecea; color: #b42318; font-size: 13px; }
.invtable tr.busy { opacity: .5; pointer-events: none; }
.invtable.fetching { opacity: .6; transition: opacity .15s; }

*/