import { useSyncExternalStore } from 'react';
import { fakeApi } from '../../core/api.js';
import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';

const SEED = [
  { id: 1, title: 'Gửi báo cáo tuần', done: false },
  { id: 2, title: 'Duyệt báo giá', done: true },
];

let st = { tasks: [], loading: false };
const subs = new Set();
const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
const useTasks = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => st);
function load() { set({ loading: true }); fakeApi(SEED).then((seed) => set({ tasks: [...seed, ...st.tasks.filter((t) => t.extra)], loading: false })); }
function addTask(title) { set({ tasks: [...st.tasks, { id: Date.now(), title, done: false, extra: true }] }); }
function toggleTask(id) { set({ tasks: st.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }); }
function removeTask(id) { set({ tasks: st.tasks.filter((x) => x.id !== id) }); }
const search = (q) => fakeApi(
  st.tasks.filter((x) => x.title.toLowerCase().includes(q.toLowerCase()))
    .map((x) => ({ id: x.id, title: x.title, subtitle: x.done ? 'tasks.done' : 'tasks.open', state: { filter: 'all' } })), 500);

const messages = {
  vi: { 'tasks.title': 'Việc cần làm', 'tasks.filters': 'Bộ lọc', 'tasks.all': 'Tất cả', 'tasks.open': 'Đang làm', 'tasks.done': 'Hoàn thành',
    'tasks.new': 'Thêm việc', 'tasks.clear': 'Xóa việc đã xong', 'tasks.delete': 'Xóa việc', 'tasks.empty': 'Chưa có công việc nào.' },
  en: { 'tasks.title': 'Tasks', 'tasks.filters': 'Filters', 'tasks.all': 'All', 'tasks.open': 'Open', 'tasks.done': 'Done',
    'tasks.new': 'Add task', 'tasks.clear': 'Clear completed', 'tasks.delete': 'Delete task', 'tasks.empty': 'No tasks yet.' },
};

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('tasks.filters')}</h3>
    {['all', 'open', 'done'].map((f) => (
      <button key={f} className={'item' + (state.filter === f ? ' on' : '')} onClick={() => setState({ filter: f })}>{t('tasks.' + f)}</button>
    ))}
  </>);
}

// C: thêm việc (dummy prompt) · R: xem danh sách · U: tick hoàn thành · D: xóa 1 việc / xóa hàng loạt việc đã xong
const ribbon = ({ state, can, t }) => ({
  groups: { home: [{ id: 'tasks', title: 'tasks.title', items: [
    { id: 'new', icon: '➕', label: 'tasks.new', disabled: !can('tasks', 'create'),
      onClick: () => { const v = prompt(t('tasks.new') + '?'); if (v) addTask(v); } },
    { id: 'clear', icon: '🗑', label: 'tasks.clear', disabled: !can('tasks', 'delete'),
      onClick: () => set({ tasks: st.tasks.filter((x) => !x.done) }) },
  ] }] },
  tabs: [{ id: 'tasks', title: 'tasks.title', groups: [{ id: 'filters', title: 'tasks.filters',
    items: ['all', 'open', 'done'].map((f) => ({ id: f, icon: '🔎', label: 'tasks.' + f, active: state.filter === f })) }] }],
});

function View({ state, can }) {
  const { t } = useI18n();
  if (!can('tasks', 'read')) return <Denied />;
  const { tasks, loading } = useTasks();
  if (loading) return <Loading />;
  const list = tasks.filter((x) => state.filter === 'all' || (state.filter === 'done') === x.done);
  return (
    <div className="pad">
      <h2>{t('tasks.' + state.filter)}</h2>
      {!list.length && <p className="empty">{t('tasks.empty')}</p>}
      {list.map((x) => (
        <div key={x.id} className="task crow">
          <input type="checkbox" checked={x.done} disabled={!can('tasks', 'update')} onChange={() => toggleTask(x.id)} />
          <span style={{ flex: 1, textDecoration: x.done ? 'line-through' : 'none' }}>{x.title}</span>
          {can('tasks', 'delete') && <button className="xbtn" onClick={() => removeTask(x.id)}>🗑</button>}
        </div>
      ))}
    </div>
  );
}

const Badge = () => {
  const open = useTasks().tasks.filter((x) => !x.done).length;
  return open ? <sup className="badge">{open}</sup> : null;
};

export default {
  id: 'tasks', title: 'tasks.title', icon: '✅', order: 4, messages, search, refresh: load,
  initialState: { filter: 'all' }, Menu, ribbon, View, Badge,
  setup({ bus }) { bus.on('task:create', ({ title }) => addTask(title)); load(); },
};
