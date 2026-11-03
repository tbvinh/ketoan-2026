import { useSyncExternalStore } from 'react';
import { fakeApi } from '../../core/api.js';
import { useI18n } from '../../core/i18n.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';

const FOLDERS = ['inbox', 'sent', 'drafts'];
const SEED = [
  { id: 1, folder: 'inbox', from: 'Nguyễn An', subject: 'Họp kế hoạch Q4', time: '09:12', body: 'Chào bạn, mình muốn họp lúc 14:00 thứ Sáu để chốt kế hoạch Q4.', unread: true },
  { id: 2, folder: 'inbox', from: 'Phòng Nhân sự', subject: 'Nộp báo cáo chấm công', time: '17:40', body: 'Vui lòng nộp báo cáo chấm công tháng này trước ngày 30.', unread: true },
  { id: 3, folder: 'sent', from: 'Tôi', subject: 'Re: Báo giá dự án', time: 'T2', body: 'Em gửi anh bản báo giá đã cập nhật.', unread: false },
  { id: 4, folder: 'drafts', from: 'Tôi', subject: '(Draft)', time: 'T6', body: '…', unread: false },
];

let st = { mails: [], loading: false };
const subs = new Set();
const set = (p) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
const useMails = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => st);
function load() { set({ loading: true }); fakeApi(SEED).then((mails) => set({ mails, loading: false })); }
function createDraft(subject) { set({ mails: [{ id: Date.now(), folder: 'drafts', from: 'Tôi', subject, time: 'now', body: '', unread: false }, ...st.mails] }); }
function toggleRead(id) { set({ mails: st.mails.map((m) => (m.id === id ? { ...m, unread: !m.unread } : m)) }); }
function removeMail(id) { set({ mails: st.mails.filter((m) => m.id !== id) }); }
const search = (q) => fakeApi(
  st.mails.filter((m) => [m.subject, m.from, m.body].join(' ').toLowerCase().includes(q.toLowerCase()))
    .map((m) => ({ id: m.id, title: m.subject, subtitle: m.from, state: { folder: m.folder, mailId: m.id, mailTitle: m.subject } })), 500);

const messages = {
  vi: { 'mail.title': 'Thư', 'mail.folders': 'Thư mục', 'mail.inbox': 'Hộp thư đến', 'mail.sent': 'Đã gửi', 'mail.drafts': 'Thư nháp',
    'mail.pick': 'Chọn một thư để đọc.', 'mail.task': 'Tạo công việc', 'mail.compose': 'Thư mới', 'mail.markread': 'Đã đọc', 'mail.markunread': 'Chưa đọc', 'mail.delete': 'Xóa thư' },
  en: { 'mail.title': 'Mail', 'mail.folders': 'Folders', 'mail.inbox': 'Inbox', 'mail.sent': 'Sent', 'mail.drafts': 'Drafts',
    'mail.pick': 'Select a message to read.', 'mail.task': 'Create task', 'mail.compose': 'New mail', 'mail.markread': 'Read', 'mail.markunread': 'Unread', 'mail.delete': 'Delete' },
};

function Menu({ state, setState }) {
  const { t } = useI18n();
  return (<>
    <h3>{t('mail.folders')}</h3>
    {FOLDERS.map((f) => (
      <button key={f} className={'item' + (state.folder === f ? ' on' : '')} onClick={() => setState({ folder: f, mailId: null })}>
        {t('mail.' + f)}
      </button>
    ))}
  </>);
}

// C: soạn thư (dummy prompt) · R: xem danh sách/nội dung · U: đánh dấu đã đọc/chưa đọc · D: xóa thư
const ribbon = ({ state, setState, bus, role, can, t }) => ({
  groups: { home: [{ id: 'mail', title: 'mail.title', items: [
    { id: 'compose', icon: '📝', label: 'mail.compose', disabled: !can('mail', 'create'),
      onClick: () => { const s = prompt(t('mail.compose') + '?'); if (s) createDraft(s); } },
    { id: 'read', icon: '👁', label: state.mailUnread ? 'mail.markread' : 'mail.markunread',
      disabled: !state.mailId || !can('mail', 'update'), onClick: () => toggleRead(state.mailId) },
    { id: 'delete', icon: '🗑', label: 'mail.delete', disabled: !state.mailId || !can('mail', 'delete'),
      onClick: () => { removeMail(state.mailId); setState({ mailId: null }); } },
    { id: 'task', icon: '✅', label: 'mail.task', disabled: !state.mailId || !can('tasks', 'create'),
      onClick: () => bus.emit('task:create', { title: state.mailTitle }) },
  ] }] },
  tabs: [{ id: 'mail', title: 'mail.title', groups: [{ id: 'folders', title: 'mail.folders',
    items: FOLDERS.map((f) => ({ id: f, icon: { inbox: '📥', sent: '📤', drafts: '📝' }[f], label: 'mail.' + f, active: state.folder === f, onClick: () => setState({ folder: f, mailId: null }) })) }] }],
});

function View({ state, setState, can }) {
  const { t } = useI18n();
  if (!can('mail', 'read')) return <Denied />;
  const { mails, loading } = useMails();
  const list = mails.filter((m) => m.folder === state.folder);
  const mail = mails.find((m) => m.id === state.mailId);
  if (loading) return <Loading />;
  return (
    <div className="mail">
      <div className="list">
        {list.map((m) => (
          <button key={m.id} className={'row' + (m.id === state.mailId ? ' on' : '')}
            onClick={() => setState({ mailId: m.id, mailTitle: m.subject, mailUnread: m.unread })}>
            <b style={{ fontWeight: m.unread ? 700 : 400 }}>{m.from}</b><span>{m.time}</span><div>{m.subject}</div>
          </button>
        ))}
      </div>
      <article className="reader">
        {!mail ? <p className="empty">{t('mail.pick')}</p> : (<>
          <h2>{mail.subject}</h2>
          <p className="muted">{mail.from} · {mail.time}</p>
          <p>{mail.body}</p>
        </>)}
      </article>
    </div>
  );
}

export default { id: 'mail', title: 'mail.title', icon: '✉️', order: 1, messages, search, refresh: load,
  initialState: { folder: 'inbox', mailId: null, mailTitle: '', mailUnread: false }, Menu, ribbon, View };
