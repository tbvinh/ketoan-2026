import { useState, useSyncExternalStore } from 'react';
import { fakeApi } from '../../core/api.js';
import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';
import Autocomplete from '../../core/Autocomplete.jsx';
import { useConfirm } from '../../core/confirm.jsx';

import { suppliersStore, customersStore, banksStore, materialsStore, searchSuppliers, searchCustomers, searchBanks, searchMaterials, vnd } from '../../core/masterdata.js';

const today = () => new Date().toISOString().slice(0, 10);

const SEED_DOCS = [
  { id: 1, no: 'PN0001', type: 'import', partner: { id: 's1', name: 'NCC Phong Vũ' }, date: '2026-09-20', note: '', lines: [
    { id: 1, product: { id: 'p1', name: 'Bàn phím cơ' }, qty: 20, price: 700000 },
    { id: 2, product: { id: 'p2', name: 'Chuột không dây' }, qty: 30, price: 220000 } ] },
  { id: 2, no: 'PX0001', type: 'export', partner: { id: 'c1', name: 'Công ty TNHH ABC' }, date: '2026-09-22', note: 'Giao tận nơi', lines: [
    { id: 1, product: { id: 'p3', name: 'Màn hình 24"' }, qty: 5, price: 3400000 } ] },
  { id: 3, no: 'PT0001', type: 'return', partner: { id: 'c2', name: 'Cửa hàng Minh Long' }, date: '2026-09-23', note: 'Hàng lỗi', lines: [
    { id: 1, product: { id: 'p5', name: 'RAM 16GB' }, qty: 2, price: 900000 } ] },
];
const PREFIX = { import: 'PN', export: 'PX', return: 'PT' };
const lineTotal = (lines) => lines.reduce((s, l) => s + l.qty * l.price, 0);
const blankDoc = (type) => ({ type, partner: null, bank: null, date: today(), note: '', lines: [] });

// ---------- Store dùng chung ----------
let st = { docs: [], loading: false };
const subs = new Set();
const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
const useDocs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => st);
function load() { set({ loading: true }); fakeApi(SEED_DOCS, 600).then((docs) => set({ docs, loading: false })); }
function saveDoc(doc) {
  if (doc.id) { set({ docs: st.docs.map((d) => (d.id === doc.id ? doc : d)) }); return; }
  const count = st.docs.filter((d) => d.type === doc.type).length + 1;
  const no = PREFIX[doc.type] + String(count).padStart(4, '0');
  set({ docs: [{ ...doc, id: Date.now(), no }, ...st.docs] });
}
function removeDoc(id) { set({ docs: st.docs.filter((d) => d.id !== id) }); }
const search = (q) => fakeApi(
  st.docs.filter((d) => (d.no + ' ' + (d.partner?.name ?? '')).toLowerCase().includes(q.toLowerCase()))
    .map((d) => ({ id: d.id, title: d.no, subtitle: d.partner?.name ?? d.type, state: { mode: 'form', editing: d } })), 500);

const messages = {
  vi: { 'inv.title': 'Nhập xuất kho', 'inv.filters': 'Loại phiếu', 'inv.all': 'Tất cả', 'inv.import': 'Nhập kho', 'inv.export': 'Xuất kho', 'inv.return': 'Trả hàng',
    'inv.no': 'Số phiếu', 'inv.type': 'Loại phiếu', 'inv.partner': 'Đối tác', 'inv.supplier': 'Nhà cung cấp', 'inv.customer': 'Khách hàng',
    'inv.date': 'Ngày', 'inv.note': 'Ghi chú', 'inv.lines': 'Chi tiết hàng hóa', 'inv.product': 'Sản phẩm', 'inv.qty': 'Số lượng', 'inv.price': 'Đơn giá',
    'inv.lineTotal': 'Thành tiền', 'inv.grandTotal': 'Tổng cộng', 'inv.addLine': 'Thêm dòng', 'inv.save': 'Lưu phiếu', 'inv.delete': 'Xóa phiếu',
    'inv.back': 'Danh sách', 'inv.empty': 'Chưa có phiếu nào.', 'inv.validate': 'Vui lòng chọn đối tác và thêm ít nhất 1 dòng hàng (mỗi dòng phải chọn sản phẩm, số lượng > 0).',
    'inv.bank': 'Ngân hàng thanh toán', 'inv.searchBank': 'Gõ để tìm ngân hàng…', 'inv.newSupplier': 'nhà cung cấp', 'inv.newCustomer': 'khách hàng', 'inv.newMaterial': 'vật tư', 'inv.newBank': 'ngân hàng',
    'inv.searchPartner': 'Gõ để tìm…', 'inv.searchProduct': 'Gõ để tìm sản phẩm…', 'inv.newImport': 'Phiếu nhập mới', 'inv.newExport': 'Phiếu xuất mới', 'inv.newReturn': 'Phiếu trả mới', 'inv.newGroup': 'Tạo phiếu',
    'inv.search': 'Tìm theo số phiếu, đối tác, ghi chú…', 'inv.clear': 'Xóa bộ lọc', 'inv.noResult': 'Không có kết quả phù hợp.',
    'inv.range': 'Hiển thị {from}–{to} / {total}', 'inv.dateFrom': 'Từ ngày', 'inv.dateTo': 'Đến ngày',
    'inv.perPage': 'Dòng/trang', 'inv.pageOf': 'Trang {p} / {n}', 'inv.first': 'Trang đầu', 'inv.prev': 'Trang trước', 'inv.next': 'Trang sau', 'inv.last': 'Trang cuối',
    'inv.confirmDeleteLine': 'Bạn có chắc muốn xóa dòng "{name}"?',
    'inv.master': 'Thông tin chung', 'inv.collapse': 'Thu gọn', 'inv.expand': 'Mở rộng',
    'inv.moveUp': 'Chuyển lên', 'inv.moveDown': 'Chuyển xuống', 'inv.drag': 'Kéo để đổi thứ tự',
    'inv.edit': 'Sửa', 'inv.deleteRow': 'Xóa', 'inv.confirmDelete': 'Bạn có chắc muốn xóa phiếu "{name}"? Thao tác này không thể hoàn tác.' },
  en: { 'inv.title': 'Inventory', 'inv.filters': 'Type', 'inv.all': 'All', 'inv.import': 'Stock in', 'inv.export': 'Stock out', 'inv.return': 'Return',
    'inv.no': 'No.', 'inv.type': 'Type', 'inv.partner': 'Partner', 'inv.supplier': 'Supplier', 'inv.customer': 'Customer',
    'inv.date': 'Date', 'inv.note': 'Note', 'inv.lines': 'Line items', 'inv.product': 'Product', 'inv.qty': 'Qty', 'inv.price': 'Unit price',
    'inv.lineTotal': 'Line total', 'inv.grandTotal': 'Grand total', 'inv.addLine': 'Add line', 'inv.save': 'Save', 'inv.delete': 'Delete document',
    'inv.back': 'Document list', 'inv.empty': 'No documents yet.', 'inv.validate': 'Please choose a partner and add at least one line (each line needs a product and qty > 0).',
    'inv.bank': 'Payment bank', 'inv.searchBank': 'Type to search banks…', 'inv.newSupplier': 'supplier', 'inv.newCustomer': 'customer', 'inv.newMaterial': 'material', 'inv.newBank': 'bank',
    'inv.searchPartner': 'Type to search…', 'inv.searchProduct': 'Type to search products…', 'inv.newImport': 'New stock-in', 'inv.newExport': 'New stock-out', 'inv.newReturn': 'New return', 'inv.newGroup': 'New document',
    'inv.search': 'Search by number, partner, note…', 'inv.clear': 'Clear filters', 'inv.noResult': 'No matching results.',
    'inv.range': 'Showing {from}–{to} of {total}', 'inv.dateFrom': 'From date', 'inv.dateTo': 'To date',
    'inv.perPage': 'Rows/page', 'inv.pageOf': 'Page {p} / {n}', 'inv.first': 'First page', 'inv.prev': 'Previous page', 'inv.next': 'Next page', 'inv.last': 'Last page',
    'inv.confirmDeleteLine': 'Are you sure you want to delete line "{name}"?',
    'inv.master': 'General info', 'inv.collapse': 'Collapse', 'inv.expand': 'Expand',
    'inv.moveUp': 'Move up', 'inv.moveDown': 'Move down', 'inv.drag': 'Drag to reorder',
    'inv.edit': 'Edit', 'inv.deleteRow': 'Delete', 'inv.confirmDelete': 'Are you sure you want to delete document "{name}"? This cannot be undone.' },
};

/* ---------- Tìm kiếm / lọc / sắp xếp / phân trang (xử lý phía client) ---------- */

const NO_FILTERS = {};
const EMPTY_VIEW = { q: '', filters: NO_FILTERS, sort: null, page: 1 };
const PAGE_SIZES = [5, 10, 20, 50, 100];

const filterDefs = (t) => [
  { key: 'dateFrom', label: t('inv.dateFrom') },
  { key: 'dateTo', label: t('inv.dateTo') },
];

// Giá trị dùng để sắp xếp theo từng cột
const SORT_GET = {
  no: (d) => d.no,
  type: (d) => d.type,
  partner: (d) => d.partner?.name ?? '',
  date: (d) => d.date,
  total: (d) => lineTotal(d.lines),
};

function applyView(docs, { filterType, q, filters, sort }) {
  const needle = (q ?? '').trim().toLowerCase();
  let list = docs.filter((d) => {
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (needle && !(d.no + ' ' + (d.partner?.name ?? '') + ' ' + (d.note ?? '')).toLowerCase().includes(needle)) return false;
    if (filters.dateFrom && d.date < filters.dateFrom) return false;
    if (filters.dateTo && d.date > filters.dateTo) return false;
    return true;
  });
  if (sort) {
    const get = SORT_GET[sort.key];
    const dir = sort.dir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const x = get(a), y = get(b);
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
    });
  }
  return list;
}

/* ---------- CSS riêng của plugin (có thể chuyển sang file style chung) ---------- */

const CSS = `
.invtable.zebra tbody tr:nth-child(even) { background: rgba(128,128,128,.09); }
.invtable.zebra tbody tr:hover { background: rgba(15,108,189,.10); }
.masterhead { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
.mastersum { font-size: 13px; color: var(--muted, #667085); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.draghandle { cursor: grab; user-select: none; padding: 0 6px; color: var(--muted, #667085); }
.draghandle:active { cursor: grabbing; }
.invtable tr.dragging { opacity: .4; }
.invtable tr.dropbefore td { box-shadow: inset 0 2px 0 var(--accent, #0f6cbd); }
.invtable tr.dropafter td { box-shadow: inset 0 -2px 0 var(--accent, #0f6cbd); }
.lineacts { white-space: nowrap; }
`;

/* ---------- Giao diện ---------- */

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('inv.filters')}</h3>
    {['all', 'import', 'export', 'return'].map((f) => (
      <button key={f} className={'item' + (state.filterType === f ? ' on' : '')}
        onClick={() => setState({ filterType: f, mode: 'list', editing: null, page: 1 })}>{t('inv.' + f)}</button>
    ))}
  </>);
}

// C: tạo phiếu Nhập/Xuất/Trả · R: xem danh sách + chi tiết · U/D: sửa/xóa trên danh sách hoặc trong form
const ribbon = ({ setState, can }) => ({
  tabs: [{ id: 'inventory', title: 'inv.title', groups: [{ id: 'new', title: 'inv.newGroup', items: [
    { id: 'new-import', icon: '📥', label: 'inv.newImport', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('import') }) },
    { id: 'new-export', icon: '📤', label: 'inv.newExport', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('export') }) },
    { id: 'new-return', icon: '↩️', label: 'inv.newReturn', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('return') }) },
  ] }] }],
});

function Toolbar({ state, setState, t, countLabel }) {
  const q = state.q ?? '';
  const filters = state.filters ?? NO_FILTERS;
  const defs = filterDefs(t);
  const active = !!q || defs.some((f) => filters[f.key]);
  const setFilter = (key, value) => setState({ filters: { ...filters, [key]: value }, page: 1 }, { replace: true });

  return (
    <div className="cattools">
      <div className="searchbox">
        <span aria-hidden="true">🔍</span>
        <input type="search" value={q} placeholder={t('inv.search')} aria-label={t('inv.search')}
          onChange={(e) => setState({ q: e.target.value, page: 1 }, { replace: true })} />
        {q && <button type="button" className="xbtn" title={t('inv.clear')} onClick={() => setState({ q: '', page: 1 }, { replace: true })}>✕</button>}
      </div>

      {defs.map((f) => (
        <label key={f.key} className="filter">
          <span>{f.label}</span>
          <input type="date" value={filters[f.key] ?? ''} onChange={(e) => setFilter(f.key, e.target.value)} />
        </label>
      ))}

      {active && <button type="button" className="tb" onClick={() => setState(EMPTY_VIEW, { replace: true })}>✕ {t('inv.clear')}</button>}
      <span className="catcount" aria-live="polite">{countLabel}</span>
    </div>
  );
}

function Pager({ page, totalPages, pageSize, setState, t }) {
  const go = (p) => setState({ page: Math.min(Math.max(1, p), totalPages) }, { replace: true });
  return (
    <div className="pager">
      <label className="filter perpage">
        <span>{t('inv.perPage')}</span>
        <select value={pageSize} onChange={(e) => setState({ pageSize: +e.target.value, page: 1 }, { replace: true })}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <div className="pagenav">
        <button type="button" className="tb" title={t('inv.first')} aria-label={t('inv.first')} disabled={page <= 1} onClick={() => go(1)}>⏮</button>
        <button type="button" className="tb" title={t('inv.prev')} aria-label={t('inv.prev')} disabled={page <= 1} onClick={() => go(page - 1)}>◀</button>
        <span className="pageinfo" aria-live="polite">{t('inv.pageOf').replace('{p}', page).replace('{n}', totalPages)}</span>
        <button type="button" className="tb" title={t('inv.next')} aria-label={t('inv.next')} disabled={page >= totalPages} onClick={() => go(page + 1)}>▶</button>
        <button type="button" className="tb" title={t('inv.last')} aria-label={t('inv.last')} disabled={page >= totalPages} onClick={() => go(totalPages)}>⏭</button>
      </div>
    </div>
  );
}

function ListView({ state, setState, docs, can, t }) {
  const confirm = useConfirm();
  const q = state.q ?? '';
  const filters = state.filters ?? NO_FILTERS;
  const sort = state.sort ?? null;
  const pageSize = state.pageSize ?? PAGE_SIZES[1];

  const all = applyView(docs, { filterType: state.filterType, q, filters, sort });
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, state.page ?? 1), totalPages);   // tự lùi trang khi dữ liệu co lại
  const items = all.slice((page - 1) * pageSize, page * pageSize);

  const from = (page - 1) * pageSize + 1;
  const countLabel = total
    ? t('inv.range').replace('{from}', from).replace('{to}', from + items.length - 1).replace('{total}', total)
    : '';
  const hasCriteria = !!q || Object.values(filters).some((v) => v !== '' && v != null);

  // Bấm tiêu đề cột: tăng dần -> giảm dần -> bỏ sắp xếp
  const toggleSort = (key) => {
    const next = !sort || sort.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
    setState({ sort: next, page: 1 }, { replace: true });
  };

  const onDelete = async (d) => {
    if (!(await confirm(t('inv.confirmDelete').replace('{name}', d.no)))) return;
    removeDoc(d.id);
  };

  const cols = [
    { key: 'no', label: t('inv.no') },
    { key: 'type', label: t('inv.type') },
    { key: 'partner', label: t('inv.partner') },
    { key: 'date', label: t('inv.date') },
    { key: 'total', label: t('inv.grandTotal') },
  ];

  return (
    <div className="pad">
      <h2>{t('inv.title')}</h2>

      <Toolbar state={state} setState={setState} t={t} countLabel={countLabel} />

      <table className="invtable zebra">
        <thead>
          <tr>
            {cols.map((c) => {
              const on = sort?.key === c.key;
              return (
                <th key={c.key} className="sortable" aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="thbtn" onClick={() => toggleSort(c.key)}>
                    {c.label}<span className="sortmark">{on ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              );
            })}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <tr key={d.id}>
              <td>{d.no}</td><td>{t('inv.' + d.type)}</td><td>{d.partner?.name}</td><td>{d.date}</td><td>{vnd(lineTotal(d.lines))}</td>
              <td>
                <button className="xbtn" title={t('inv.edit')} aria-label={t('inv.edit')} onClick={() => setState({ mode: 'form', editing: d })}>✏️</button>
                {can('inventory', 'delete') && (
                  <button className="xbtn" title={t('inv.deleteRow')} aria-label={t('inv.deleteRow')} onClick={() => onDelete(d)}>🗑</button>
                )}
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr><td colSpan={cols.length + 1} className="empty">{hasCriteria ? t('inv.noResult') : t('inv.empty')}</td></tr>
          )}
        </tbody>
      </table>

      {total > 0 && <Pager page={page} totalPages={totalPages} pageSize={pageSize} setState={setState} t={t} />}
    </div>
  );
}

// Form master-detail: master = loại phiếu + đối tác (autocomplete) + ngày + ghi chú
// detail = danh sách dòng hàng, mỗi dòng chọn sản phẩm bằng autocomplete (tự điền đơn giá)
function FormView({ state, setState, can, t }) {
  const confirm = useConfirm();
  const editing = state.editing;
  const isNew = !editing.id;
  const savePerm = isNew ? can('inventory', 'create') : can('inventory', 'update');
  const partnerFetcher = editing.type === 'import' ? searchSuppliers : searchCustomers;
  const partnerStore = editing.type === 'import' ? suppliersStore : customersStore;
  const update = (patch) => setState({ editing: { ...editing, ...patch } }, { replace: true });

  // store.add của Danh mục là bất đồng bộ (bên Danh mục cũng `await store.add`), nên phải await
  // để lấy id thật; nếu không thì c.id / c.name là undefined và phiếu lưu ra dữ liệu hỏng.
  const createPartner = can('catalog', 'create') ? async (name) => { const c = await partnerStore.add({ name }); return { id: c.id, name: c.name }; } : undefined;
  const createBank = can('catalog', 'create') ? async (name) => { const b = await banksStore.add({ name }); return { id: b.id, name: b.name }; } : undefined;
  const createMaterial = can('catalog', 'create') ? async (name) => { const m = await materialsStore.add({ name, unit: 'cái', price: 0, typeId: null }); return { id: m.id, name: m.name, price: 0 }; } : undefined;
  const updateLine = (id, patch) => update({ lines: editing.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLine = () => update({ lines: [...editing.lines, { id: Date.now() + Math.random(), product: null, qty: 1, price: 0 }] });
  // Dòng trống (chưa chọn sản phẩm, giá = 0) xóa thẳng; dòng đã có dữ liệu thì hỏi xác nhận
  const isLineEmpty = (l) => !l.product && !l.price;
  const removeLine = async (l) => {
    if (!isLineEmpty(l)) {
      const name = l.product?.name || t('inv.product');
      if (!(await confirm(t('inv.confirmDeleteLine').replace('{name}', name)))) return;
    }
    update({ lines: editing.lines.filter((x) => x.id !== l.id) });
  };
  const total = lineTotal(editing.lines);

  const [masterOpen, setMasterOpen] = useState(true);   // thu gọn master để detail hiển thị nhiều dòng hơn
  const [drag, setDrag] = useState({ from: null, over: null });
  // Đổi thứ tự dòng: dùng chung cho kéo thả và nút ▲▼
  const moveLine = (from, to) => {
    if (from == null || to == null || from === to || to < 0 || to >= editing.lines.length) return;
    const next = [...editing.lines];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    update({ lines: next });
  };
  const endDrag = () => setDrag({ from: null, over: null });
  const summary = [t('inv.' + editing.type), editing.partner?.name, editing.bank?.name, editing.date, editing.note].filter(Boolean).join(' · ');

  const doSave = () => {
    const linesOk = editing.lines.every((l) => l.product?.id != null && l.qty > 0);
    if (!editing.partner || !editing.lines.length || !linesOk) { alert(t('inv.validate')); return; }
    saveDoc(editing);
    // Phiếu mới: bỏ tìm kiếm/lọc/sắp xếp/trang để phiếu vừa tạo hiện ngay ở đầu danh sách.
    // Phiếu cũ: giữ nguyên bộ lọc người dùng đang xem.
    setState(isNew
      ? { mode: 'list', editing: null, filterType: 'all', ...EMPTY_VIEW }
      : { mode: 'list', editing: null });
  };
  const doDelete = async () => {
    if (!(await confirm(t('inv.confirmDelete').replace('{name}', editing.no)))) return;
    removeDoc(editing.id);
    setState({ mode: 'list', editing: null });
  };

  return (
    <div className="pad">
      <div className="ghead">
        <h2>{isNew ? t('inv.new' + editing.type[0].toUpperCase() + editing.type.slice(1)) : editing.no}</h2>
        <button className="tb" onClick={() => setState({ mode: 'list', editing: null })}>← {t('inv.back')}</button>
      </div>

      <div className="masterhead">
        <button type="button" className="tb" aria-expanded={masterOpen} onClick={() => setMasterOpen((v) => !v)}>
          {masterOpen ? '▾' : '▸'} {t('inv.master')}
        </button>
        {!masterOpen && <span className="mastersum">{summary}</span>}
      </div>

      {masterOpen && <div className="invmaster">
        <label>{t('inv.type')}
          <select value={editing.type} disabled={!isNew} onChange={(e) => update({ type: e.target.value, partner: null })}>
            <option value="import">{t('inv.import')}</option>
            <option value="export">{t('inv.export')}</option>
            <option value="return">{t('inv.return')}</option>
          </select>
        </label>
        <label>{editing.type === 'import' ? t('inv.supplier') : t('inv.customer')}
          <Autocomplete value={editing.partner} onChange={(p) => update({ partner: p })} fetcher={partnerFetcher} placeholder={t('inv.searchPartner')}
            onCreate={createPartner} createLabel={t('ac.create') + ' ' + t(editing.type === 'import' ? 'inv.newSupplier' : 'inv.newCustomer')} />
        </label>
        <label>{t('inv.bank')}
          <Autocomplete value={editing.bank} onChange={(b) => update({ bank: b })} fetcher={searchBanks} placeholder={t('inv.searchBank')}
            onCreate={createBank} createLabel={t('ac.create') + ' ' + t('inv.newBank')} />
        </label>
        <label>{t('inv.date')}<input type="date" value={editing.date} onChange={(e) => update({ date: e.target.value })} /></label>
        <label>{t('inv.note')}<input value={editing.note} onChange={(e) => update({ note: e.target.value })} /></label>
      </div>}

      <h3>{t('inv.lines')}</h3>
      <table className="invtable zebra">
        <thead><tr><th /><th>{t('inv.product')}</th><th>{t('inv.qty')}</th><th>{t('inv.price')}</th><th>{t('inv.lineTotal')}</th><th /></tr></thead>
        <tbody>
          {editing.lines.map((l, i) => {
            const dropCls = drag.from !== null && drag.over === i && drag.from !== i ? (drag.from < i ? ' dropafter' : ' dropbefore') : '';
            return (
              <tr key={l.id} className={(drag.from === i ? 'dragging' : '') + dropCls}
                onDragOver={(e) => { if (drag.from === null) return; e.preventDefault(); if (drag.over !== i) setDrag((d) => ({ ...d, over: i })); }}
                onDrop={(e) => { e.preventDefault(); moveLine(drag.from, i); endDrag(); }}>
                <td>
                  <span className="draghandle" draggable title={t('inv.drag')} aria-label={t('inv.drag')}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(l.id));
                      const tr = e.currentTarget.closest('tr');
                      if (tr) e.dataTransfer.setDragImage(tr, 10, 10);
                      setDrag({ from: i, over: i });
                    }}
                    onDragEnd={endDrag}>⠿</span>
                </td>
                <td><Autocomplete value={l.product} onChange={(p) => updateLine(l.id, { product: p, price: p?.price ?? l.price })} fetcher={searchMaterials} placeholder={t('inv.searchProduct')}
                  onCreate={createMaterial} createLabel={t('ac.create') + ' ' + t('inv.newMaterial')} /></td>
                <td><input type="number" min="1" className="qty" value={l.qty} onChange={(e) => updateLine(l.id, { qty: +e.target.value || 0 })} /></td>
                <td><input type="number" min="0" className="qty" value={l.price} onChange={(e) => updateLine(l.id, { price: +e.target.value || 0 })} /></td>
                <td>{vnd(l.qty * l.price)}</td>
                <td className="lineacts">
                  <button type="button" className="xbtn" title={t('inv.moveUp')} aria-label={t('inv.moveUp')} disabled={i === 0} onClick={() => moveLine(i, i - 1)}>▲</button>
                  <button type="button" className="xbtn" title={t('inv.moveDown')} aria-label={t('inv.moveDown')} disabled={i === editing.lines.length - 1} onClick={() => moveLine(i, i + 1)}>▼</button>
                  <button type="button" className="xbtn" title={t('inv.deleteRow')} aria-label={t('inv.deleteRow')} onClick={() => removeLine(l)}>🗑</button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr><td colSpan={4} style={{ textAlign: 'right' }}><b>{t('inv.grandTotal')}</b></td><td colSpan={2}><b>{vnd(total)}</b></td></tr></tfoot>
      </table>
      <button className="tb" onClick={addLine}>➕ {t('inv.addLine')}</button>

      <div className="formActions">
        <button className="btn" disabled={!savePerm} onClick={doSave}>{t('inv.save')}</button>
        {!isNew && can('inventory', 'delete') && <button className="tb" onClick={doDelete}>🗑 {t('inv.delete')}</button>}
      </div>
    </div>
  );
}

// Toàn bộ hook nằm trong Body; View chỉ kiểm tra quyền rồi mới mount Body (không vi phạm thứ tự hook).
function Body(props) {
  const { state } = props;
  const { t } = useI18n();
  const { docs, loading } = useDocs();
  if (loading) return <Loading />;
  return (<>
    <style>{CSS}</style>
    {state.mode === 'form' && state.editing
      ? <FormView {...props} t={t} />
      : <ListView {...props} docs={docs} t={t} />}
  </>);
}

function View(props) {
  if (!props.can('inventory', 'read')) return <Denied />;
  return <Body {...props} />;
}

export default {
  id: 'inventory', title: 'inv.title', icon: '📦', order: 5, messages, search, refresh: load,
  initialState: { mode: 'list', filterType: 'all', editing: null, pageSize: 5, ...EMPTY_VIEW }, Menu, ribbon, View,
  setup() { load(); },
};