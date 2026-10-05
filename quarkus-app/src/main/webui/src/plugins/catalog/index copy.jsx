import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';
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
  },
  en: {
    'cat.title': 'Master Data', 'cat.suppliers': 'Suppliers', 'cat.customers': 'Customers', 'cat.materials': 'Materials',
    'cat.materialTypes': 'Material Types', 'cat.banks': 'Banks', 'cat.accounts': 'Accounting Accounts',
    'cat.code': 'Code', 'cat.name': 'Name', 'cat.phone': 'Phone', 'cat.address': 'Address',
    'cat.bankCode': 'Bank code', 'cat.branch': 'Branch', 'cat.unit': 'Unit', 'cat.price': 'Price', 'cat.type': 'Material type',
    'cat.accCode': 'Account no.', 'cat.new': 'Add new', 'cat.edit': 'Edit', 'cat.save': 'Save', 'cat.cancel': 'Cancel',
    'cat.empty': 'No data yet.', 'cat.newType': 'Add new material type',
  },
};

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

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('cat.title')}</h3>
    {CATS.map((c) => (
      <button key={c.id} className={'item' + (state.category === c.id ? ' on' : '')}
        onClick={() => setState({ category: c.id, editing: null })}>{c.icon} {t('cat.' + c.id)}</button>
    ))}
  </>);
}

function View({ state, setState, can }) {
  const { t } = useI18n();
  if (!can('catalog', 'read')) return <Denied />;
  const cat = CATS.find((c) => c.id === state.category);
  const { items, loading } = cat.store.use();
  const types = materialTypesStore.use().items;   // luôn gọi để giữ số lượng hook ổn định giữa các danh mục
  if (loading) return <Loading />;

  const schema = schemaFor(cat.id, t, types);
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

  return (
    <div className="pad">
      <div className="ghead">
        <h2>{t('cat.' + cat.id)}</h2>
        {can('catalog', 'create') && <button className="tb" onClick={() => setState({ editing: schema.reduce((o, f) => ({ ...o, [f.key]: '' }), {}) })}>➕ {t('cat.new')}</button>}
      </div>
      <table className="invtable">
        <thead><tr>{schema.map((f) => <th key={f.key}>{f.label}</th>)}<th /></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              {schema.map((f) => <td key={f.key}>{f.display ? f.display(it) : it[f.key]}</td>)}
              <td>
                {can('catalog', 'update') && <button className="xbtn" onClick={() => setState({ editing: { ...it } })}>✏️</button>}
                {can('catalog', 'delete') && <button className="xbtn" onClick={() => cat.store.remove(it.id)}>🗑</button>}
              </td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={schema.length + 1} className="empty">{t('cat.empty')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default { id: 'catalog', title: 'cat.title', icon: '🗂️', order: 6, messages,
  initialState: { category: 'suppliers', editing: null }, Menu, View };
