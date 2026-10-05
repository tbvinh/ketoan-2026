import { useI18n } from '../../core/i18n.jsx';
import { usePermissions, togglePerm, PLUGIN_IDS, ACTIONS } from '../../core/permissions.js';

const NAMES = { mail: 'mail.title', calendar: 'cal.title', people: 'people.title', tasks: 'tasks.title', inventory: 'inv.title', catalog: 'cat.title' };

const messages = {
  vi: { 'admin.title': 'Quản trị', 'admin.perm': 'Phân quyền vai trò "Người dùng"', 'admin.plugin': 'Plugin',
    'admin.read': 'Xem', 'admin.create': 'Thêm', 'admin.update': 'Sửa', 'admin.delete': 'Xóa',
    'admin.note': 'Vai trò Quản trị viên luôn có đầy đủ quyền trên mọi plugin. Bảng dưới chỉ áp dụng cho vai trò "Người dùng", lưu ngay khi tick.' },
  en: { 'admin.title': 'Admin', 'admin.perm': 'Permissions for role "User"', 'admin.plugin': 'Plugin',
    'admin.read': 'Read', 'admin.create': 'Create', 'admin.update': 'Update', 'admin.delete': 'Delete',
    'admin.note': 'The Admin role always has full access to every plugin. The table below applies only to the "User" role and saves as you tick.' },
};

function View() {
  const { t } = useI18n();
  const perms = usePermissions();
  return (
    <div className="pad">
      <h2>{t('admin.perm')}</h2>
      <p className="muted">{t('admin.note')}</p>
      <table className="permtable">
        <thead><tr><th>{t('admin.plugin')}</th>{ACTIONS.map((a) => <th key={a}>{t('admin.' + a)}</th>)}</tr></thead>
        <tbody>
          {PLUGIN_IDS.map((id) => (
            <tr key={id}>
              <td>{t(NAMES[id])}</td>
              {ACTIONS.map((a) => (
                <td key={a}><input type="checkbox" checked={!!perms[id][a]} onChange={() => togglePerm(id, a)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default { id: 'admin', title: 'admin.title', icon: '🛡️', order: 99, adminOnly: true, messages, View };
