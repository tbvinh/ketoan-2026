import { useSyncExternalStore } from 'react';
import { fakeApi } from '../../core/api.js';
import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';

const CALS = { work: '#0f6cbd', life: '#107c10' };
const SEED = [
  { id: 1, t: 'Daily standup', d: 0, s: 9, e: 9.5, c: 'work' },
  { id: 2, t: 'Gym', d: 1, s: 18, e: 19, c: 'life' },
  { id: 3, t: 'Design review', d: 2, s: 10, e: 12, c: 'work' },
  { id: 4, t: 'Q4 planning', d: 4, s: 14, e: 15.5, c: 'work' },
];
const H = 48; // px mỗi giờ, lưới bắt đầu từ 8h
const hm = (h) => `${Math.floor(h)}:${h % 1 ? '30' : '00'}`;

let st = { events: [], loading: false };
const subs = new Set();
const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
const useEvents = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => st);
function load() { set({ loading: true }); fakeApi(SEED).then((events) => set({ events, loading: false })); }
function createEvent(t) { set({ events: [...st.events, { id: Date.now(), t, d: 0, s: 13, e: 14, c: 'work' }] }); }
function renameEvent(id, t) { set({ events: st.events.map((e) => (e.id === id ? { ...e, t } : e)) }); }
function removeEvent(id) { set({ events: st.events.filter((e) => e.id !== id) }); }
const search = (q) => fakeApi(
  st.events.filter((e) => e.t.toLowerCase().includes(q.toLowerCase()))
    .map((e) => ({ id: e.id, title: e.t, subtitle: `${hm(e.s)} – ${hm(e.e)}`, state: {} })), 500);

const messages = {
  vi: { 'cal.title': 'Lịch', 'cal.mine': 'Lịch của tôi', 'cal.work': 'Công việc', 'cal.life': 'Cá nhân',
    'cal.new': 'Sự kiện mới', 'cal.rename': 'Đổi tên', 'cal.delete': 'Xóa sự kiện', 'cal.pick': 'Chọn một sự kiện.' },
  en: { 'cal.title': 'Calendar', 'cal.mine': 'My calendars', 'cal.work': 'Work', 'cal.life': 'Personal',
    'cal.new': 'New event', 'cal.rename': 'Rename', 'cal.delete': 'Delete event', 'cal.pick': 'Select an event.' },
};

function Menu({ state, setState }) {
  const { t } = useI18n();
  const toggle = (id) => setState({ hidden: state.hidden.includes(id) ? state.hidden.filter((x) => x !== id) : [...state.hidden, id] });
  return (<>
    <h3>{t('cal.mine')}</h3>
    {Object.entries(CALS).map(([id, color]) => (
      <label key={id} className="item">
        <input type="checkbox" checked={!state.hidden.includes(id)} onChange={() => toggle(id)} />
        <i className="dot" style={{ background: color }} />{t('cal.' + id)}
      </label>
    ))}
  </>);
}

// C: thêm sự kiện (dummy prompt) · R: xem lưới tuần · U: đổi tên sự kiện đang chọn · D: xóa sự kiện đang chọn
const ribbon = ({ state, setState, can, t }) => ({
  tabs: [{ id: 'calendar', title: 'cal.title', groups: [
    { id: 'crud', title: 'cal.title', items: [
      { id: 'new', icon: '➕', label: 'cal.new', disabled: !can('calendar', 'create'),
        onClick: () => { const v = prompt(t('cal.new') + '?'); if (v) createEvent(v); } },
      { id: 'rename', icon: '✏️', label: 'cal.rename', disabled: !state.eventId || !can('calendar', 'update'),
        onClick: () => { const v = prompt(t('cal.rename'), state.eventTitle); if (v) renameEvent(state.eventId, v); } },
      { id: 'delete', icon: '🗑', label: 'cal.delete', disabled: !state.eventId || !can('calendar', 'delete'),
        onClick: () => { removeEvent(state.eventId); setState({ eventId: null }); } },
    ] },
    { id: 'show', title: 'cal.mine',
      items: Object.keys(CALS).map((id) => ({ id, icon: '📆', label: 'cal.' + id, active: !state.hidden.includes(id),
        onClick: () => setState({ hidden: state.hidden.includes(id) ? state.hidden.filter((x) => x !== id) : [...state.hidden, id] }) })) },
  ] }],
});

function View({ state, setState, can }) {
  const { t } = useI18n();
  if (!can('calendar', 'read')) return <Denied />;
  const { events, loading } = useEvents();
  if (loading) return <Loading />;
  return (
    <div className="week">
      {[0, 1, 2, 3, 4].map((d) => (
        <div key={d} className="col">
          <div className="colhead">{new Date(2024, 0, 1 + d).toLocaleDateString(undefined, { weekday: 'long' })}</div>
          <div className="slots">
            {events.filter((e) => e.d === d && !state.hidden.includes(e.c)).map((e) => (
              <button key={e.id} className={'ev' + (e.id === state.eventId ? ' on' : '')}
                style={{ top: (e.s - 8) * H, height: (e.e - e.s) * H - 2, background: CALS[e.c] }}
                onClick={() => setState({ eventId: e.id, eventTitle: e.t })}>{e.t}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default { id: 'calendar', title: 'cal.title', icon: '📅', order: 2, messages, search, refresh: load,
  initialState: { hidden: [], eventId: null, eventTitle: '' }, Menu, ribbon, View };
