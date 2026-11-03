import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';
import { useConfirm } from '../../core/confirm.jsx';
import { useDebounced } from '../../core/useDebounced.js';
import {
  openingBalancesStore, partnersStore, banksStore, accountsStore, materialsStore, employeesStore, vnd,
} from '../../core/masterdata.js';

/* ---------- 7 nhóm khai báo đầu kỳ ---------- */

const CATS = [
  { id: 'debt', icon: '🤝' },
  { id: 'loan', icon: '🏦' },
  { id: 'bank', icon: '💳' },
  { id: 'account', icon: '📒' },
  { id: 'material', icon: '📦' },
  { id: 'tool', icon: '🧰' },
  { id: 'advance', icon: '🧑‍💼' },
];

const DEFAULT_DIRECTION = {
  debt: 'receivable', loan: 'credit', bank: 'debit', account: 'debit',
  material: 'debit', tool: 'debit', advance: 'debit',
};

const FIELDS = {
  debt: [
    { key: 'partnerId', type: 'partner', required: true },
    { key: 'direction', type: 'direction', options: ['receivable', 'payable'], required: true },
    { key: 'amount', type: 'money', required: true },
    { key: 'dueDate', type: 'date' },
    { key: 'name', type: 'text', required: true },
  ],
  loan: [
    { key: 'name', type: 'text', required: true },
    { key: 'amount', type: 'money', required: true },
    { key: 'interestRate', type: 'rate' },
    { key: 'dueDate', type: 'date' },
  ],
  bank: [
    { key: 'bankId', type: 'bank', required: true },
    { key: 'amount', type: 'money', required: true },
    { key: 'name', type: 'text', required: true },
  ],
  account: [
    { key: 'accountId', type: 'account', required: true },
    { key: 'direction', type: 'direction', options: ['debit', 'credit'], required: true },
    { key: 'amount', type: 'money', required: true },
    { key: 'name', type: 'text', required: true },
  ],
  material: [
    { key: 'materialId', type: 'material', required: true },
    { key: 'quantity', type: 'quantity', required: true },
    { key: 'unitPrice', type: 'money', required: true },
    { key: 'name', type: 'text' },
  ],
  tool: [
    { key: 'materialId', type: 'material' },
    { key: 'quantity', type: 'quantity', required: true },
    { key: 'unitPrice', type: 'money', required: true },
    { key: 'name', type: 'text', required: true },
  ],
  advance: [
    { key: 'employeeId', type: 'employee', required: true },
    { key: 'amount', type: 'money', required: true },
    { key: 'name', type: 'text', required: true },
  ],
};

const COLS = {
  debt: ['code', 'name', 'partnerId', 'direction', 'amount', 'dueDate'],
  loan: ['code', 'name', 'amount', 'interestRate', 'dueDate'],
  bank: ['code', 'name', 'bankId', 'amount'],
  account: ['code', 'name', 'accountId', 'direction', 'amount'],
  material: ['code', 'name', 'materialId', 'quantity', 'unitPrice', 'amount'],
  tool: ['code', 'name', 'materialId', 'quantity', 'unitPrice', 'amount'],
  advance: ['code', 'name', 'employeeId', 'amount'],
};

const LABELS = {
  code: 'open.code', name: 'open.name', amount: 'open.amount', quantity: 'open.quantity',
  unitPrice: 'open.unitPrice', dueDate: 'open.dueDate', interestRate: 'open.interestRate',
  direction: 'open.direction', partnerId: 'open.partner', bankId: 'open.bankName',
  accountId: 'open.accountName', materialId: 'open.materialName', employeeId: 'open.employee',
};

const NUMERIC = new Set(['quantity', 'unitPrice', 'amount', 'interestRate']);

const messages = {
  vi: {
    'open.title': 'Khai báo đầu kỳ',
    'open.debt': 'Công nợ phải thu / phải trả', 'open.loan': 'Tiền vay', 'open.bank': 'Tiền gửi ngân hàng',
    'open.account': 'Số dư tài khoản', 'open.material': 'Vật tư, hàng hóa', 'open.tool': 'Công cụ dụng cụ',
    'open.advance': 'Tạm ứng nhân viên',
    'open.code': 'Mã', 'open.name': 'Diễn giải', 'open.amount': 'Số tiền', 'open.quantity': 'Số lượng',
    'open.unitPrice': 'Đơn giá', 'open.dueDate': 'Ngày đến hạn', 'open.interestRate': 'Lãi suất (%/năm)',
    'open.direction': 'Loại', 'open.partner': 'Đối tượng', 'open.bankName': 'Ngân hàng',
    'open.accountName': 'Tài khoản', 'open.materialName': 'Vật tư', 'open.employee': 'Nhân viên',
    'open.receivable': 'Phải thu', 'open.payable': 'Phải trả', 'open.debit': 'Dư Nợ', 'open.credit': 'Dư Có',
    'open.new': 'Thêm mới', 'open.edit': 'Sửa', 'open.save': 'Lưu', 'open.cancel': 'Hủy', 'open.delete': 'Xóa',
    'open.saving': 'Đang lưu…', 'open.search': 'Tìm theo mã, diễn giải…', 'open.all': 'Tất cả',
    'open.clear': 'Xóa bộ lọc', 'open.empty': 'Chưa có dữ liệu.', 'open.noResult': 'Không có kết quả phù hợp.',
    'open.loadFailed': 'Không tải được dữ liệu', 'open.saveFailed': 'Không thể lưu', 'open.retry': 'Thử lại',
    'open.confirmDelete': 'Bạn có chắc muốn xóa "{name}"? Thao tác này không thể hoàn tác.',
    'open.required': '{field} không được để trống.', 'open.total': 'Tổng cộng', 'open.entries': 'bản ghi',
    'open.pageOf': 'Trang {p} / {n}', 'open.prev': 'Trang trước', 'open.next': 'Trang sau',
  },
  en: {
    'open.title': 'Opening balances',
    'open.debt': 'Receivables / payables', 'open.loan': 'Loans', 'open.bank': 'Bank deposits',
    'open.account': 'Chart of accounts balances', 'open.material': 'Inventory / materials',
    'open.tool': 'Tools & supplies', 'open.advance': 'Employee advances',
    'open.code': 'Code', 'open.name': 'Description', 'open.amount': 'Amount', 'open.quantity': 'Quantity',
    'open.unitPrice': 'Unit price', 'open.dueDate': 'Due date', 'open.interestRate': 'Interest rate (%/year)',
    'open.direction': 'Type', 'open.partner': 'Partner', 'open.bankName': 'Bank',
    'open.accountName': 'Account', 'open.materialName': 'Material', 'open.employee': 'Employee',
    'open.receivable': 'Receivable', 'open.payable': 'Payable', 'open.debit': 'Debit balance', 'open.credit': 'Credit balance',
    'open.new': 'New', 'open.edit': 'Edit', 'open.save': 'Save', 'open.cancel': 'Cancel', 'open.delete': 'Delete',
    'open.saving': 'Saving…', 'open.search': 'Search by code or description…', 'open.all': 'All',
    'open.clear': 'Clear filters', 'open.empty': 'No data.', 'open.noResult': 'No matching results.',
    'open.loadFailed': 'Could not load data', 'open.saveFailed': 'Could not save', 'open.retry': 'Retry',
    'open.confirmDelete': 'Delete "{name}"? This cannot be undone.',
    'open.required': '{field} is required.', 'open.total': 'Total', 'open.entries': 'entries',
    'open.pageOf': 'Page {p} / {n}', 'open.prev': 'Previous page', 'open.next': 'Next page',
  },
};

const CSS = `
.invtable td.num { text-align: right; white-space: nowrap; }
.invtable tbody tr:hover { background: rgba(15,108,189,.08); }
.invtable td.acts { white-space: nowrap; text-align: right; }
.openform { max-width: 720px; }
.formError { margin: 8px 0; padding: 8px 10px; border-radius: 6px; background: #fdecea; color: #b42318; font-size: 13px; }
`;

/* ---------- tiện ích ---------- */

const optionLabel = (type, x) => (type === 'account' ? `${x.code} - ${x.name}` : x.name);

const findName = (list, id) => {
  const x = list.find((i) => i.id === id);
  return x ? optionLabel('', x) : '';
};

const isEmpty = (v) => v == null || v === '' || (typeof v === 'number' && v <= 0);

function missingField(form, fields) {
  return fields.find((f) => f.required && isEmpty(form[f.key])) ?? null;
}

/* ---------- sub-navigation ---------- */

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('open.title')}</h3>
    {CATS.map((c) => (
      <button key={c.id} className={'item' + (state.kind === c.id ? ' on' : '')}
        onClick={() => setState({ kind: c.id, editing: null, error: null, q: '', direction: '', page: 1 })}>
        {c.icon} {t('open.' + c.id)}
      </button>
    ))}
  </>);
}

function blankForm(kind) {
  return {
    kind,
    direction: DEFAULT_DIRECTION[kind],
    quantity: kind === 'material' || kind === 'tool' ? 1 : 0,
    unitPrice: 0, amount: 0, interestRate: 0,
  };
}

const ribbon = ({ state, setState, can }) => ({
  tabs: [{ id: 'opening', title: 'open.title', groups: [{ id: 'actions', title: 'open.title', items: [
    { id: 'open-new', icon: '➕', label: 'open.new', disabled: !can('opening', 'create'),
      onClick: () => setState({ editing: blankForm(state.kind), error: null }) },
  ] }] }],
});

const search = (q) => openingBalancesStore.search(q).then((rows) => rows.map((r) => (
  { id: r.id, title: r.name, subtitle: r.code, state: { kind: r.kind } }
)));

/* ---------- form field ---------- */

function Field({ f, form, setField, lists, t }) {
  const label = t(LABELS[f.key]);
  const value = form[f.key] ?? '';

  if (['partner', 'bank', 'account', 'material', 'employee'].includes(f.type)) {
    const list = lists[f.type];
    return (
      <label>{label}
        <select value={value} onChange={(e) => {
          const id = e.target.value;
          setField(f.key, id, list.find((x) => x.id === id));
        }}>
          <option value="">--</option>
          {list.map((x) => <option key={x.id} value={x.id}>{optionLabel(f.type, x)}</option>)}
        </select>
      </label>
    );
  }

  if (f.type === 'direction') {
    return (
      <label>{label}
        <select value={value} onChange={(e) => setField(f.key, e.target.value)}>
          <option value="">--</option>
          {f.options.map((o) => <option key={o} value={o}>{t('open.' + o)}</option>)}
        </select>
      </label>
    );
  }

  if (f.type === 'date') {
    return <label>{label}<input type="date" value={value} onChange={(e) => setField(f.key, e.target.value)} /></label>;
  }

  const numeric = f.type !== 'text';
  return (
    <label>{label}
      <input type={numeric ? 'number' : 'text'} min={numeric ? 0 : undefined}
        step={f.type === 'rate' ? '0.01' : numeric ? '1000' : undefined} value={value}
        onChange={(e) => setField(f.key, numeric ? (+e.target.value || 0) : e.target.value)} />
    </label>
  );
}

/* ---------- view ---------- */

function Body({ state, setState, can }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const kind = state.kind ?? 'debt';
  const fields = FIELDS[kind];
  const cols = COLS[kind];

  const lists = {
    partner: partnersStore.use().items,
    bank: banksStore.use().items,
    account: accountsStore.use().items,
    material: materialsStore.use().items,
    employee: employeesStore.use().items,
  };

  const q = state.q ?? '';
  const settledQ = useDebounced(q, 300);
  const page = Math.max(1, state.page ?? 1);
  const pageSize = state.pageSize ?? 10;

  const { items, total, loading, fetching, error: loadError, reload } = openingBalancesStore.useQuery(
    { q: settledQ, page, pageSize, filters: { kind, direction: state.direction } },
    { enabled: q === settledQ },
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const editing = state.editing;

  const setField = (key, value, item) => {
    const patch = { [key]: value };
    if (item && !editing.name) patch.name = item.name;
    setState({ editing: { ...editing, ...patch } }, { replace: true });
  };

  const save = async () => {
    const lack = missingField(editing, fields);
    if (lack) {
      setState({ error: t('open.required').replace('{field}', t(LABELS[lack.key])) }, { replace: true });
      return;
    }
    const body = { ...editing, kind, direction: editing.direction || DEFAULT_DIRECTION[kind] };
    if (kind === 'material' || kind === 'tool') body.amount = (body.quantity || 0) * (body.unitPrice || 0);
    if (!body.name && body.materialId) body.name = findName(lists.material, body.materialId);
    setState({ saving: true, error: null }, { replace: true });
    try {
      if (body.id) await openingBalancesStore.update(body.id, body);
      else await openingBalancesStore.add(body);
      setState({ editing: null, saving: false });
    } catch (e) {
      setState({ saving: false, error: e.message }, { replace: true });
    }
  };

  if (loading) return <Loading />;

  if (editing) {
    const savePerm = editing.id ? can('opening', 'update') : can('opening', 'create');
    const computed = (editing.quantity || 0) * (editing.unitPrice || 0);
    return (
      <div className="pad">
        <style>{CSS}</style>
        <h2>{editing.id ? t('open.edit') : t('open.new')} — {t('open.' + kind)}</h2>
        <div className="invmaster openform">
          {fields.map((f) => (
            <Field key={f.key} f={f} form={editing} setField={setField} lists={lists} t={t} />
          ))}
          {(kind === 'material' || kind === 'tool') && (
            <label>{t('open.total')}<input value={vnd(computed)} readOnly /></label>
          )}
        </div>
        {state.error && <p className="formError" role="alert">{t('open.saveFailed')}: {state.error}</p>}
        <div className="formActions">
          <button className="btn" disabled={!savePerm || state.saving} onClick={save}>
            {state.saving ? t('open.saving') : t('open.save')}
          </button>
          <button className="tb" disabled={state.saving} onClick={() => setState({ editing: null, error: null })}>
            {t('open.cancel')}
          </button>
        </div>
      </div>
    );
  }

  const cell = (key, it) => {
    switch (key) {
      case 'partnerId': return findName(lists.partner, it.partnerId);
      case 'bankId': return findName(lists.bank, it.bankId);
      case 'accountId': {
        const acc = lists.account.find((x) => x.id === it.accountId);
        return acc ? `${acc.code} - ${acc.name}` : '';
      }
      case 'materialId': return findName(lists.material, it.materialId);
      case 'employeeId': return findName(lists.employee, it.employeeId);
      case 'direction': return t('open.' + (it.direction || DEFAULT_DIRECTION[it.kind]));
      case 'amount': return vnd(it.amount || (it.quantity || 0) * (it.unitPrice || 0));
      case 'unitPrice': return vnd(it.unitPrice);
      case 'interestRate': return `${it.interestRate ?? 0} %`;
      default: return it[key] ?? '';
    }
  };

  const pageTotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const canDelete = can('opening', 'delete');
  const hasCriteria = !!q || (kind === 'debt' && !!state.direction);

  return (
    <div className="pad">
      <style>{CSS}</style>
      <div className="ghead">
        <h2>{t('open.' + kind)}</h2>
        {can('opening', 'create') && (
          <button className="tb" onClick={() => setState({ editing: blankForm(kind), error: null })}>
            ➕ {t('open.new')}
          </button>
        )}
      </div>

      <div className="cattools">
        <div className="searchbox">
          <span aria-hidden="true">🔍</span>
          <input type="search" value={q} placeholder={t('open.search')} aria-label={t('open.search')}
            onChange={(e) => setState({ q: e.target.value, page: 1 }, { replace: true })} />
          {q && <button type="button" className="xbtn" title={t('open.clear')}
            onClick={() => setState({ q: '', page: 1 }, { replace: true })}>✕</button>}
        </div>

        {kind === 'debt' && (
          <label className="filter">
            <span>{t('open.direction')}</span>
            <select value={state.direction ?? ''}
              onChange={(e) => setState({ direction: e.target.value, page: 1 }, { replace: true })}>
              <option value="">{t('open.all')}</option>
              <option value="receivable">{t('open.receivable')}</option>
              <option value="payable">{t('open.payable')}</option>
            </select>
          </label>
        )}

        {hasCriteria && (
          <button type="button" className="tb"
            onClick={() => setState({ q: '', direction: '', page: 1 }, { replace: true })}>
            ✕ {t('open.clear')}
          </button>
        )}
        <span className="catcount" aria-live="polite">
          {fetching ? '⏳ ' : ''}{total} {t('open.entries')} · {t('open.total')}: {vnd(pageTotal)}
        </span>
      </div>

      {state.error && <p className="formError" role="alert">{state.error}</p>}
      {loadError && (
        <p className="formError" role="alert">
          {t('open.loadFailed')}: {loadError.message}{' '}
          <button type="button" className="tb" onClick={reload}>{t('open.retry')}</button>
        </p>
      )}

      <table className={'invtable' + (fetching ? ' fetching' : '')} aria-busy={fetching}>
        <thead>
          <tr>
            {cols.map((k) => (
              <th key={k} className={NUMERIC.has(k) ? 'num' : undefined}>{t(LABELS[k])}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              {cols.map((k) => (
                <td key={k} className={NUMERIC.has(k) ? 'num' : undefined}>{cell(k, it)}</td>
              ))}
              <td className="acts">
                {can('opening', 'update') && (
                  <button type="button" className="xbtn" title={t('open.edit')} aria-label={t('open.edit')}
                    onClick={() => setState({ editing: { ...it }, error: null })}>✏️</button>
                )}
                {canDelete && (
                  <button type="button" className="xbtn" title={t('open.delete')} aria-label={t('open.delete')}
                    onClick={async () => {
                      if (!(await confirm(t('open.confirmDelete').replace('{name}', it.name || it.code || '')))) return;
                      setState({ error: null }, { replace: true });
                      try { await openingBalancesStore.remove(it.id); }
                      catch (e) { setState({ error: e.message }, { replace: true }); }
                    }}>🗑</button>
                )}
              </td>
            </tr>
          ))}
          {!items.length && !fetching && (
            <tr><td colSpan={cols.length + 1} className="empty">
              {loadError ? t('open.loadFailed') : hasCriteria ? t('open.noResult') : t('open.empty')}
            </td></tr>
          )}
        </tbody>
      </table>

      {total > 0 && (
        <div className="pager">
          <span />
          <div className="pagenav">
            <button type="button" className="tb" title={t('open.prev')} aria-label={t('open.prev')}
              disabled={page <= 1} onClick={() => setState({ page: page - 1 }, { replace: true })}>◀</button>
            <span className="pageinfo">{t('open.pageOf').replace('{p}', page).replace('{n}', totalPages)}</span>
            <button type="button" className="tb" title={t('open.next')} aria-label={t('open.next')}
              disabled={page >= totalPages} onClick={() => setState({ page: page + 1 }, { replace: true })}>▶</button>
          </div>
        </div>
      )}
    </div>
  );
}

function View(props) {
  if (!props.can('opening', 'read')) return <Denied />;
  return <Body key={props.state.kind ?? 'debt'} {...props} />;
}

export default {
  id: 'opening', title: 'open.title', icon: '📊', order: 4, messages, search,
  initialState: { kind: 'debt', q: '', direction: '', page: 1, pageSize: 10, editing: null, error: null, saving: false },
  Menu, ribbon, View,
};

