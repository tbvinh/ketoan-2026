import { useSyncExternalStore } from 'react';
import { fakeApi } from '../../core/api.js';
import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';
import Autocomplete from '../../core/Autocomplete.jsx';

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

// ---------- Store dùng chung (giống pattern của các plugin khác) ----------
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
    'inv.back': 'Danh sách', 'inv.empty': 'Chưa có phiếu nào.', 'inv.validate': 'Vui lòng chọn đối tác và thêm ít nhất 1 dòng hàng.',
    'inv.bank': 'Ngân hàng thanh toán', 'inv.searchBank': 'Gõ để tìm ngân hàng…', 'inv.newSupplier': 'nhà cung cấp', 'inv.newCustomer': 'khách hàng', 'inv.newMaterial': 'vật tư', 'inv.newBank': 'ngân hàng',
    'inv.searchPartner': 'Gõ để tìm…', 'inv.searchProduct': 'Gõ để tìm sản phẩm…', 'inv.newImport': 'Phiếu nhập mới', 'inv.newExport': 'Phiếu xuất mới', 'inv.newReturn': 'Phiếu trả mới', 'inv.newGroup': 'Tạo phiếu' },
  en: { 'inv.title': 'Inventory', 'inv.filters': 'Type', 'inv.all': 'All', 'inv.import': 'Stock in', 'inv.export': 'Stock out', 'inv.return': 'Return',
    'inv.no': 'No.', 'inv.type': 'Type', 'inv.partner': 'Partner', 'inv.supplier': 'Supplier', 'inv.customer': 'Customer',
    'inv.date': 'Date', 'inv.note': 'Note', 'inv.lines': 'Line items', 'inv.product': 'Product', 'inv.qty': 'Qty', 'inv.price': 'Unit price',
    'inv.lineTotal': 'Line total', 'inv.grandTotal': 'Grand total', 'inv.addLine': 'Add line', 'inv.save': 'Save', 'inv.delete': 'Delete document',
    'inv.back': 'Document list', 'inv.empty': 'No documents yet.', 'inv.validate': 'Please choose a partner and add at least one line.',
    'inv.bank': 'Payment bank', 'inv.searchBank': 'Type to search banks…', 'inv.newSupplier': 'supplier', 'inv.newCustomer': 'customer', 'inv.newMaterial': 'material', 'inv.newBank': 'bank',
    'inv.searchPartner': 'Type to search…', 'inv.searchProduct': 'Type to search products…', 'inv.newImport': 'New stock-in', 'inv.newExport': 'New stock-out', 'inv.newReturn': 'New return', 'inv.newGroup': 'New document' },
};

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('inv.filters')}</h3>
    {['all', 'import', 'export', 'return'].map((f) => (
      <button key={f} className={'item' + (state.filterType === f ? ' on' : '')}
        onClick={() => setState({ filterType: f, mode: 'list', editing: null })}>{t('inv.' + f)}</button>
    ))}
  </>);
}

// C: tạo phiếu Nhập/Xuất/Trả · R: xem danh sách + chi tiết · U/D: xử lý trong form (Lưu/Xóa)
const ribbon = ({ setState, can }) => ({
  tabs: [{ id: 'inventory', title: 'inv.title', groups: [{ id: 'new', title: 'inv.newGroup', items: [
    { id: 'new-import', icon: '📥', label: 'inv.newImport', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('import') }) },
    { id: 'new-export', icon: '📤', label: 'inv.newExport', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('export') }) },
    { id: 'new-return', icon: '↩️', label: 'inv.newReturn', disabled: !can('inventory', 'create'), onClick: () => setState({ mode: 'form', editing: blankDoc('return') }) },
  ] }] }],
});

function ListView({ state, setState, docs, t }) {
  const list = docs.filter((d) => state.filterType === 'all' || d.type === state.filterType);
  return (
    <div className="pad">
      <h2>{t('inv.title')}</h2>
      <table className="invtable">
        <thead><tr><th>{t('inv.no')}</th><th>{t('inv.type')}</th><th>{t('inv.partner')}</th><th>{t('inv.date')}</th><th>{t('inv.grandTotal')}</th></tr></thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.id} className="rowclick" onClick={() => setState({ mode: 'form', editing: d })}>
              <td>{d.no}</td><td>{t('inv.' + d.type)}</td><td>{d.partner?.name}</td><td>{d.date}</td><td>{vnd(lineTotal(d.lines))}</td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={5} className="empty">{t('inv.empty')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// Form master-detail: master = loại phiếu + đối tác (autocomplete) + ngày + ghi chú
// detail = danh sách dòng hàng, mỗi dòng chọn sản phẩm bằng autocomplete (tự điền đơn giá)
function FormView({ state, setState, can, t }) {
  const editing = state.editing;
  const isNew = !editing.id;
  const savePerm = isNew ? can('inventory', 'create') : can('inventory', 'update');
  const partnerFetcher = editing.type === 'import' ? searchSuppliers : searchCustomers;
  const partnerStore = editing.type === 'import' ? suppliersStore : customersStore;
  const update = (patch) => setState({ editing: { ...editing, ...patch } }, { replace: true });

  // Tạo nhanh đối tác / vật tư / ngân hàng mới ngay trong ô autocomplete (yêu cầu quyền Thêm của Danh mục)
  const createPartner = can('catalog', 'create') ? async (name) => { const c = partnerStore.add({ name }); return { id: c.id, name: c.name }; } : undefined;
  const createBank = can('catalog', 'create') ? async (name) => { const b = banksStore.add({ name }); return { id: b.id, name: b.name }; } : undefined;
  const createMaterial = can('catalog', 'create') ? async (name) => { const m = materialsStore.add({ name, unit: 'cái', price: 0, typeId: null }); return { id: m.id, name: m.name, price: 0 }; } : undefined;
  const updateLine = (id, patch) => update({ lines: editing.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLine = () => update({ lines: [...editing.lines, { id: Date.now() + Math.random(), product: null, qty: 1, price: 0 }] });
  const removeLine = (id) => update({ lines: editing.lines.filter((l) => l.id !== id) });
  const total = lineTotal(editing.lines);

  const doSave = () => {
    if (!editing.partner || !editing.lines.length) { alert(t('inv.validate')); return; }
    saveDoc(editing);
    setState({ mode: 'list', editing: null });
  };
  const doDelete = () => { removeDoc(editing.id); setState({ mode: 'list', editing: null }); };

  return (
    <div className="pad">
      <div className="ghead">
        <h2>{isNew ? t('inv.new' + editing.type[0].toUpperCase() + editing.type.slice(1)) : editing.no}</h2>
        <button className="tb" onClick={() => setState({ mode: 'list', editing: null })}>← {t('inv.back')}</button>
      </div>

      <div className="invmaster">
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
      </div>

      <h3>{t('inv.lines')}</h3>
      <table className="invtable">
        <thead><tr><th>{t('inv.product')}</th><th>{t('inv.qty')}</th><th>{t('inv.price')}</th><th>{t('inv.lineTotal')}</th><th /></tr></thead>
        <tbody>
          {editing.lines.map((l) => (
            <tr key={l.id}>
              <td><Autocomplete value={l.product} onChange={(p) => updateLine(l.id, { product: p, price: p?.price ?? l.price })} fetcher={searchMaterials} placeholder={t('inv.searchProduct')}
                onCreate={createMaterial} createLabel={t('ac.create') + ' ' + t('inv.newMaterial')} /></td>
              <td><input type="number" min="1" className="qty" value={l.qty} onChange={(e) => updateLine(l.id, { qty: +e.target.value || 0 })} /></td>
              <td><input type="number" min="0" className="qty" value={l.price} onChange={(e) => updateLine(l.id, { price: +e.target.value || 0 })} /></td>
              <td>{vnd(l.qty * l.price)}</td>
              <td><button className="xbtn" onClick={() => removeLine(l.id)}>🗑</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3} style={{ textAlign: 'right' }}><b>{t('inv.grandTotal')}</b></td><td colSpan={2}><b>{vnd(total)}</b></td></tr></tfoot>
      </table>
      <button className="tb" onClick={addLine}>➕ {t('inv.addLine')}</button>

      <div className="formActions">
        <button className="btn" disabled={!savePerm} onClick={doSave}>{t('inv.save')}</button>
        {!isNew && can('inventory', 'delete') && <button className="tb" onClick={doDelete}>🗑 {t('inv.delete')}</button>}
      </div>
    </div>
  );
}

function View(props) {
  const { state, can } = props;
  const { t } = useI18n();
  if (!can('inventory', 'read')) return <Denied />;
  const { docs, loading } = useDocs();
  if (loading) return <Loading />;
  return state.mode === 'form' && state.editing
    ? <FormView {...props} t={t} />
    : <ListView {...props} docs={docs} t={t} />;
}

export default {
  id: 'inventory', title: 'inv.title', icon: '📦', order: 5, messages, search, refresh: load,
  initialState: { mode: 'list', filterType: 'all', editing: null }, Menu, ribbon, View,
  setup() { load(); },
};
