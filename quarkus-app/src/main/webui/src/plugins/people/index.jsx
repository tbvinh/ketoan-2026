import { useSyncExternalStore } from 'react';
import { fakeApi } from '../../core/api.js';
import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';

const GROUPS = ['all', 'colleague', 'client'];
const SEED = [
  { id: 1, n: 'Nguyễn An', g: 'colleague', e: 'an@congty.vn' },
  { id: 2, n: 'Trần Bình', g: 'client', e: 'binh@khach.vn' },
  { id: 3, n: 'Lê Chi', g: 'colleague', e: 'chi@congty.vn' },
];

let st = { people: [], loading: false };
const subs = new Set();
const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
const usePeople = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => st);
function load() { set({ loading: true }); fakeApi(SEED).then((people) => set({ people, loading: false })); }
function addPerson(n, e) { set({ people: [...st.people, { id: Date.now(), n, g: 'colleague', e }] }); }
function editEmail(id, e) { set({ people: st.people.map((p) => (p.id === id ? { ...p, e } : p)) }); }
function removePerson(id) { set({ people: st.people.filter((p) => p.id !== id) }); }
const search = (q) => fakeApi(
  st.people.filter((p) => (p.n + ' ' + p.e).toLowerCase().includes(q.toLowerCase()))
    .map((p) => ({ id: p.id, title: p.n, subtitle: p.e, state: { group: 'all', q: p.n } })), 500);

const messages = {
  vi: { 'people.title': 'Danh bạ', 'people.groups': 'Nhóm', 'people.all': 'Tất cả', 'people.colleague': 'Đồng nghiệp', 'people.client': 'Khách hàng',
    'people.search': 'Lọc theo tên…', 'people.empty': 'Không có liên hệ nào.', 'people.new': 'Thêm liên hệ', 'people.edit': 'Sửa email', 'people.delete': 'Xóa liên hệ' },
  en: { 'people.title': 'People', 'people.groups': 'Groups', 'people.all': 'All', 'people.colleague': 'Colleagues', 'people.client': 'Clients',
    'people.search': 'Filter by name…', 'people.empty': 'No contacts found.', 'people.new': 'Add contact', 'people.edit': 'Edit email', 'people.delete': 'Delete contact' },
};

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('people.groups')}</h3>
    {GROUPS.map((g) => (
      <button key={g} className={'item' + (state.group === g ? ' on' : '')} onClick={() => setState({ group: g })}>{t('people.' + g)}</button>
    ))}
  </>);
}

// C: thêm liên hệ (dummy prompt) · R: xem danh sách · U: sửa email liên hệ đang chọn · D: xóa liên hệ
const ribbon = ({ state, setState, can, t }) => ({
  groups: { home: [{ id: 'find', title: 'people.title', items: [{ id: 'q', render: () => (
    <input className="rin" value={state.q} onChange={(e) => setState({ q: e.target.value }, { replace: true })} placeholder={t('people.search')} />) }] }] },
  tabs: [{ id: 'people', title: 'people.title', groups: [
    { id: 'crud', title: 'people.title', items: [
      { id: 'new', icon: '➕', label: 'people.new', disabled: !can('people', 'create'),
        onClick: () => { const n = prompt(t('people.new') + ' – tên?'); const e = n && prompt('Email?'); if (n && e) addPerson(n, e); } },
      { id: 'edit', icon: '✏️', label: 'people.edit', disabled: !state.personId || !can('people', 'update'),
        onClick: () => { const e = prompt(t('people.edit'), state.personEmail); if (e) editEmail(state.personId, e); } },
      { id: 'delete', icon: '🗑', label: 'people.delete', disabled: !state.personId || !can('people', 'delete'),
        onClick: () => { removePerson(state.personId); setState({ personId: null }); } },
    ] },
    { id: 'groups', title: 'people.groups',
      items: GROUPS.map((g) => ({ id: g, icon: '👤', label: 'people.' + g, active: state.group === g, onClick: () => setState({ group: g }) })) },
  ] }],
});

function View({ state, setState, can }) {
  const { t } = useI18n();
  if (!can('people', 'read')) return <Denied />;
  const { people, loading } = usePeople();
  if (loading) return <Loading />;
  const list = people.filter((p) => (state.group === 'all' || p.g === state.group) && p.n.toLowerCase().includes(state.q.toLowerCase()));
  return (
    <div className="pad">
      <h2>{t('people.' + state.group)}</h2>
      {!list.length && <p className="empty">{t('people.empty')}</p>}
      {list.map((p) => (
        <button key={p.e} className={'person crow' + (p.id === state.personId ? ' on' : '')}
          onClick={() => setState({ personId: p.id, personEmail: p.e })} style={{ width: '100%', background: p.id === state.personId ? '#dbe8f5' : 'transparent' }}>
          <span className="avatar">{p.n.split(' ').pop()[0]}</span>
          <div><b>{p.n}</b><div className="muted">{p.e}</div></div>
        </button>
      ))}
    </div>
  );
}

export default { id: 'people', title: 'people.title', icon: '👥', order: 3, messages, search, refresh: load,
  initialState: { group: 'all', q: '', personId: null, personEmail: '' }, Menu, ribbon, View };
