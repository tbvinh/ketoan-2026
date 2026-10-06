import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
let idSeq = Date.now();
const nextId = () => ++idSeq;   // Date.now() có thể trùng khi import nhiều phiếu trong cùng 1 ms
function saveDoc(doc) {
  if (doc.id) { set({ docs: st.docs.map((d) => (d.id === doc.id ? doc : d)) }); return; }
  const count = st.docs.filter((d) => d.type === doc.type).length + 1;
  const no = PREFIX[doc.type] + String(count).padStart(4, '0');
  set({ docs: [{ ...doc, id: nextId(), no }, ...st.docs] });
}
function removeDoc(id) { set({ docs: st.docs.filter((d) => d.id !== id) }); }
function removeDocs(ids) { const gone = new Set(ids); set({ docs: st.docs.filter((d) => !gone.has(d.id)) }); }
const search = (q) => fakeApi(
  st.docs.filter((d) => (d.no + ' ' + (d.partner?.name ?? '')).toLowerCase().includes(q.toLowerCase()))
    .map((d) => ({ id: d.id, title: d.no, subtitle: d.partner?.name ?? d.type, state: { mode: 'form', editing: d } })), 500);

const messages = {
  vi: { 'inv.importFile': 'Import', 'inv.importTitle': 'Import phiếu từ file CSV', 'inv.importTemplate': 'Tải file mẫu', 'inv.close': 'Đóng',
    'inv.importHint': 'File CSV (UTF-8, phân tách bằng , hoặc ;). Mỗi dòng là 1 dòng hàng; các dòng cùng cột "ref" thuộc cùng 1 phiếu. Cột bắt buộc: type (import/export/return), partner, product, qty. Đối tác/sản phẩm/ngân hàng chưa có sẽ được tạo mới trong Danh mục nếu bạn có quyền.',
    'inv.importBusy': 'Đang import…', 'inv.importDone': 'Đã import {n} phiếu.', 'inv.importErrors': '{n} lỗi (các phiếu lỗi được bỏ qua):',
    'inv.errEmpty': 'File trống', 'inv.errRead': 'Không đọc được file', 'inv.errHeader': 'File thiếu cột bắt buộc: {cols}',
    'inv.errLine': 'Dòng {line}: {msg}', 'inv.errType': 'Loại phiếu không hợp lệ (import/export/return)', 'inv.errPartner': 'Thiếu đối tác',
    'inv.errDate': 'Ngày không hợp lệ (YYYY-MM-DD hoặc DD/MM/YYYY)', 'inv.errProduct': 'Thiếu sản phẩm', 'inv.errQty': 'Số lượng phải lớn hơn 0',
    'inv.errPrice': 'Đơn giá không hợp lệ', 'inv.errNotFound': 'Không tìm thấy "{name}" trong Danh mục',
    'inv.selectAll': 'Chọn tất cả trên trang', 'inv.selectRow': 'Chọn phiếu', 'inv.selected': 'Đã chọn {n} phiếu', 'inv.selectAllResults': 'Chọn tất cả {n} phiếu',
    'inv.clearSel': 'Bỏ chọn', 'inv.deleteSelected': 'Xóa đã chọn', 'inv.confirmBulkDelete': 'Bạn có chắc muốn xóa {n} phiếu đã chọn? Thao tác này không thể hoàn tác.',
    'inv.title': 'Nhập xuất kho', 'inv.filters': 'Loại phiếu', 'inv.all': 'Tất cả', 'inv.import': 'Nhập kho', 'inv.export': 'Xuất kho', 'inv.return': 'Trả hàng',
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
  en: { 'inv.importFile': 'Import', 'inv.importTitle': 'Import documents from CSV', 'inv.importTemplate': 'Download template', 'inv.close': 'Close',
    'inv.importHint': 'CSV file (UTF-8, separated by , or ;). Each row is one line item; rows sharing the same "ref" belong to one document. Required columns: type (import/export/return), partner, product, qty. Missing partners/products/banks are created in Master Data if you have permission.',
    'inv.importBusy': 'Importing…', 'inv.importDone': 'Imported {n} documents.', 'inv.importErrors': '{n} errors (failed documents were skipped):',
    'inv.errEmpty': 'File is empty', 'inv.errRead': 'Could not read file', 'inv.errHeader': 'Missing required columns: {cols}',
    'inv.errLine': 'Row {line}: {msg}', 'inv.errType': 'Invalid type (import/export/return)', 'inv.errPartner': 'Partner is missing',
    'inv.errDate': 'Invalid date (YYYY-MM-DD or DD/MM/YYYY)', 'inv.errProduct': 'Product is missing', 'inv.errQty': 'Qty must be greater than 0',
    'inv.errPrice': 'Invalid unit price', 'inv.errNotFound': '"{name}" was not found in Master Data',
    'inv.selectAll': 'Select all on this page', 'inv.selectRow': 'Select document', 'inv.selected': '{n} selected', 'inv.selectAllResults': 'Select all {n} documents',
    'inv.clearSel': 'Clear selection', 'inv.deleteSelected': 'Delete selected', 'inv.confirmBulkDelete': 'Are you sure you want to delete {n} selected documents? This cannot be undone.',
    'inv.title': 'Inventory', 'inv.filters': 'Type', 'inv.all': 'All', 'inv.import': 'Stock in', 'inv.export': 'Stock out', 'inv.return': 'Return',
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
.selcol { width: 32px; text-align: center; }
.invtable tr.sel td { background: rgba(15,108,189,.16); }
.bulkbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 8px 0; padding: 8px 12px; border-radius: 6px; background: rgba(15,108,189,.12); }
.importbox { margin: 8px 0 12px; padding: 12px 14px; border: 1px dashed var(--border, #d0d5dd); border-radius: 8px; }
.importhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.importhint { margin: 0 0 10px; font-size: 12.5px; color: var(--muted, #667085); }
.importacts { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.importres { margin-top: 10px; font-size: 13px; }
.importerr { margin: 6px 0 0; padding-left: 18px; color: #b42318; max-height: 160px; overflow: auto; }
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
    { id: 'import-file', icon: '📂', label: 'inv.importFile', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'list', editing: null, importing: true }) },
  ] }] }],
});

/* ---------- Import CSV ---------- */

const norm = (s) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'd').replace(/\s+/g, ' ').toLowerCase().trim();

const IMPORT_COLS = ['ref', 'type', 'partner', 'date', 'note', 'bank', 'product', 'qty', 'price'];
const IMPORT_REQUIRED = ['type', 'partner', 'product', 'qty'];
const TEMPLATE_CSV = [
  'ref,type,partner,date,note,bank,product,qty,price',
  'A1,import,NCC Phong Vũ,2026-10-01,Nhập đợt 1,,Bàn phím cơ,10,700000',
  'A1,import,NCC Phong Vũ,2026-10-01,Nhập đợt 1,,Chuột không dây,20,220000',
  'B1,export,Công ty TNHH ABC,2026-10-02,Giao tận nơi,,RAM 16GB,5,900000',
].join('\r\n');

function downloadTemplate() {
  const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'inventory-import-template.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Parser CSV nhỏ: hỗ trợ dấu ngoặc kép, dấu phân cách , hoặc ; (Excel tiếng Việt hay xuất ;)
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const parseNum = (v) => {
  const x = String(v ?? '').trim().replace(/\s/g, '');
  if (x === '') return NaN;
  return Number(/^\d{1,3}([.,]\d{3})+$/.test(x) ? x.replace(/[.,]/g, '') : x.replace(',', '.'));   // 700.000 -> 700000
};
const parseDate = (v) => {
  const x = (v ?? '').trim();
  if (!x) return today();
  let m = x.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) { const d = x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (d) m = [x, d[3], d[2].padStart(2, '0'), d[1].padStart(2, '0')]; }
  if (!m) return null;
  const iso = m[1] + '-' + m[2] + '-' + m[3];
  return Number.isNaN(Date.parse(iso)) ? null : iso;
};

// Trả về { ok, errors }. Phiếu có lỗi bị bỏ qua, các phiếu hợp lệ vẫn được lưu.
async function importDocs(text, { can, t }) {
  const rows = parseCsv(text);
  if (!rows.length) return { ok: 0, errors: [t('inv.errEmpty')] };
  const head = rows[0].map((h) => norm(h));
  const idx = Object.fromEntries(IMPORT_COLS.map((c) => [c, head.indexOf(c)]));
  const missing = IMPORT_REQUIRED.filter((c) => idx[c] < 0);
  if (missing.length) return { ok: 0, errors: [t('inv.errHeader').replace('{cols}', missing.join(', '))] };
  const cell = (r, c) => (idx[c] >= 0 ? (r[idx[c]] ?? '').trim() : '');

  // Gom các dòng cùng "ref" thành 1 phiếu (ref trống = mỗi dòng 1 phiếu); thông tin phiếu lấy ở dòng đầu
  const groups = [];
  const byRef = new Map();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const ref = cell(r, 'ref');
    let g = ref ? byRef.get(ref) : null;
    if (!g) { g = { line, r, rows: [] }; groups.push(g); if (ref) byRef.set(ref, g); }
    g.rows.push({ line, r });
  });

  // Tìm bản ghi trong Danh mục theo tên (không phân biệt dấu/hoa thường); chưa có thì tạo nếu được phép
  const canCreate = can('catalog', 'create');
  const cache = new Map();
  const resolve = async (kind, name, fetcher, add) => {
    const key = kind + '|' + norm(name);
    if (cache.has(key)) return cache.get(key);
    const hit = (await fetcher(name)).find((x) => norm(x.name) === norm(name));
    const v = hit ?? (canCreate ? await add(name) : null);
    cache.set(key, v);
    return v;
  };
  const simpleAdd = (store) => async (name) => { const c = await store.add({ name }); return { id: c.id, name: c.name }; };
  const partnerRes = (type, name) => (type === 'import'
    ? resolve('s', name, searchSuppliers, simpleAdd(suppliersStore))
    : resolve('c', name, searchCustomers, simpleAdd(customersStore)));
  const bankRes = (name) => resolve('b', name, searchBanks, simpleAdd(banksStore));
  const productRes = (name) => resolve('p', name, searchMaterials, async (n) => {
    const m = await materialsStore.add({ name: n, unit: 'cái', price: 0, typeId: null });
    return { id: m.id, name: m.name, price: 0 };
  });

  const errors = [];
  let ok = 0;
  const err = (line, msg) => errors.push(t('inv.errLine').replace('{line}', line).replace('{msg}', msg));
  const notFound = (name) => t('inv.errNotFound').replace('{name}', name);

  for (const g of groups) {
    const type = cell(g.r, 'type').toLowerCase();
    if (!PREFIX[type]) { err(g.line, t('inv.errType')); continue; }
    const partnerName = cell(g.r, 'partner');
    if (!partnerName) { err(g.line, t('inv.errPartner')); continue; }
    const date = parseDate(cell(g.r, 'date'));
    if (!date) { err(g.line, t('inv.errDate')); continue; }

    // Kiểm tra dữ liệu từng dòng hàng trước khi đụng tới Danh mục (tránh tạo bản ghi mồ côi)
    const specs = [];
    let bad = false;
    for (const { line, r } of g.rows) {
      const pname = cell(r, 'product');
      const qty = parseNum(cell(r, 'qty'));
      const priceRaw = cell(r, 'price');
      const price = priceRaw === '' ? null : parseNum(priceRaw);
      if (!pname) { err(line, t('inv.errProduct')); bad = true; break; }
      if (!(qty > 0)) { err(line, t('inv.errQty')); bad = true; break; }
      if (price !== null && !(price >= 0)) { err(line, t('inv.errPrice')); bad = true; break; }
      specs.push({ pname, qty, price });
    }
    if (bad) continue;

    const partner = await partnerRes(type, partnerName);
    if (!partner) { err(g.line, notFound(partnerName)); continue; }
    const bankName = cell(g.r, 'bank');
    const bank = bankName ? await bankRes(bankName) : null;
    if (bankName && !bank) { err(g.line, notFound(bankName)); continue; }

    const lines = [];
    for (const sp of specs) {
      const product = await productRes(sp.pname);
      if (!product) { err(g.line, notFound(sp.pname)); bad = true; break; }
      lines.push({ id: nextId(), product: { id: product.id, name: product.name, price: product.price }, qty: sp.qty, price: sp.price ?? product.price ?? 0 });
    }
    if (bad) continue;

    saveDoc({
      type, partner: { id: partner.id, name: partner.name }, bank: bank ? { id: bank.id, name: bank.name } : null,
      date, note: cell(g.r, 'note'), lines,
    });
    ok++;
  }
  return { ok, errors };
}

// Checkbox "chọn tất cả" có trạng thái lưng chừng (indeterminate)
function HeaderCheck({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate && !checked; }, [indeterminate, checked]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} title={label} />;
}

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
  const [imp, setImp] = useState({ busy: false, result: null, key: 0 });
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

  // ----- Chọn nhiều + xóa hàng loạt -----
  // Chỉ tính các phiếu đang hiển thị theo bộ lọc hiện tại, để không lỡ xóa phiếu đang bị ẩn
  const canDelete = can('inventory', 'delete');
  const selSet = new Set(state.selected ?? []);
  const selected = all.filter((d) => selSet.has(d.id));
  const pageAllSelected = items.length > 0 && items.every((d) => selSet.has(d.id));
  const pageSomeSelected = items.some((d) => selSet.has(d.id));
  const setSel = (ids) => setState({ selected: ids }, { replace: true });
  const toggleOne = (id) => setSel(selSet.has(id) ? [...selSet].filter((x) => x !== id) : [...selSet, id]);
  const togglePage = () => {
    const ids = items.map((d) => d.id);
    setSel(pageAllSelected ? [...selSet].filter((x) => !ids.includes(x)) : [...new Set([...selSet, ...ids])]);
  };
  const onBulkDelete = async () => {
    if (!selected.length) return;
    if (!(await confirm(t('inv.confirmBulkDelete').replace('{n}', selected.length)))) return;
    removeDocs(selected.map((d) => d.id));
    setSel([]);
  };

  // ----- Import -----
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImp((s) => ({ ...s, busy: true, result: null }));
    let result;
    try { result = await importDocs(await file.text(), { can, t }); }
    catch (err) { result = { ok: 0, errors: [t('inv.errRead') + ': ' + (err?.message ?? err)] }; }
    setImp((s) => ({ busy: false, result, key: s.key + 1 }));   // đổi key để chọn lại cùng 1 file vẫn chạy
    if (result.ok) setState({ filterType: 'all', ...EMPTY_VIEW }, { replace: true });   // cho phiếu mới hiện ở đầu danh sách
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
      <div className="ghead">
        <h2>{t('inv.title')}</h2>
        {can('inventory', 'create') && (
          <button className="tb" onClick={() => setState({ importing: !state.importing }, { replace: true })}>📂 {t('inv.importFile')}</button>
        )}
      </div>

      {state.importing && can('inventory', 'create') && (
        <div className="importbox">
          <div className="importhead">
            <b>{t('inv.importTitle')}</b>
            <button type="button" className="xbtn" title={t('inv.close')} aria-label={t('inv.close')} onClick={() => setState({ importing: false }, { replace: true })}>✕</button>
          </div>
          <p className="importhint">{t('inv.importHint')}</p>
          <div className="importacts">
            <input key={imp.key} type="file" accept=".csv,text/csv" disabled={imp.busy} onChange={onFile} />
            <button type="button" className="tb" onClick={downloadTemplate}>⬇ {t('inv.importTemplate')}</button>
            {imp.busy && <span>⏳ {t('inv.importBusy')}</span>}
          </div>
          {imp.result && (
            <div className="importres" role="status">
              {imp.result.ok > 0 && <div>✅ {t('inv.importDone').replace('{n}', imp.result.ok)}</div>}
              {imp.result.errors.length > 0 && (<>
                <div>⚠️ {t('inv.importErrors').replace('{n}', imp.result.errors.length)}</div>
                <ul className="importerr">{imp.result.errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </>)}
            </div>
          )}
        </div>
      )}

      <Toolbar state={state} setState={setState} t={t} countLabel={countLabel} />

      {selected.length > 0 && (
        <div className="bulkbar" role="status">
          <b>{t('inv.selected').replace('{n}', selected.length)}</b>
          {pageAllSelected && selected.length < total && (
            <button type="button" className="tb" onClick={() => setSel(all.map((d) => d.id))}>{t('inv.selectAllResults').replace('{n}', total)}</button>
          )}
          <button type="button" className="tb" onClick={() => setSel([])}>{t('inv.clearSel')}</button>
          <button type="button" className="tb" onClick={onBulkDelete}>🗑 {t('inv.deleteSelected')} ({selected.length})</button>
        </div>
      )}

      <table className="invtable zebra">
        <thead>
          <tr>
            {canDelete && (
              <th className="selcol">
                <HeaderCheck checked={pageAllSelected} indeterminate={pageSomeSelected} onChange={togglePage} label={t('inv.selectAll')} />
              </th>
            )}
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
            <tr key={d.id} className={selSet.has(d.id) ? 'sel' : undefined}>
              {canDelete && (
                <td className="selcol">
                  <input type="checkbox" checked={selSet.has(d.id)} onChange={() => toggleOne(d.id)} aria-label={t('inv.selectRow') + ' ' + d.no} />
                </td>
              )}
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
            <tr><td colSpan={cols.length + 1 + (canDelete ? 1 : 0)} className="empty">{hasCriteria ? t('inv.noResult') : t('inv.empty')}</td></tr>
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
  initialState: { mode: 'list', filterType: 'all', editing: null, pageSize: 5, selected: [], importing: false, ...EMPTY_VIEW }, Menu, ribbon, View,
  setup() { load(); },
};