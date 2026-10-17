import { useEffect, useState } from 'react';
import { useI18n } from '../../core/i18n.jsx';
import MediaUpload from '../../core/MediaUpload.jsx';
import { useConfirm } from '../../core/confirm.jsx';
import { Loading } from '../../core/ui.jsx';
import Denied from '../../core/Denied.jsx';
import { PLUGIN_IDS, ACTIONS } from '../../core/permissions.js';
import { getCompanyId, setActiveCompany, setCompanies } from '../../core/tenant.js';
import { adminApi } from '../../api/adminApi.js';

const MODULE_KEYS = {
  inventory: 'inv.title', catalog: 'cat.title', opening: 'open.title', cash: 'cash.title',
  bank: 'bank.title', general: 'general.title', reports: 'reports.title',
};
const ACTION_KEYS = {
  read: 'admin.read', create: 'admin.create', update: 'admin.update',
  delete: 'admin.delete', import: 'admin.import', export: 'admin.export',
};

const messages = {
  vi: {
    'admin.title': 'Quản trị', 'admin.usersTab': 'Người dùng', 'admin.rolesTab': 'Vai trò & phân quyền',
    'admin.perm': 'Ma trận phân quyền', 'admin.plugin': 'Chức năng',
    'admin.read': 'Xem', 'admin.create': 'Thêm', 'admin.update': 'Sửa', 'admin.delete': 'Xóa',
    'admin.import': 'Import', 'admin.export': 'Export',
    'admin.note': 'Vai trò Quản trị viên luôn có đầy đủ quyền. Tick để cấp quyền chi tiết cho vai trò đang chọn.',
    'admin.username': 'Tên đăng nhập', 'admin.fullName': 'Họ tên', 'admin.password': 'Mật khẩu', 'admin.avatar': 'Ảnh đại diện',
    'admin.role': 'Vai trò', 'admin.active': 'Hoạt động', 'admin.actions': 'Thao tác',
    'admin.newUser': 'Thêm người dùng', 'admin.editUser': 'Sửa người dùng',
    'admin.searchUser': 'Tìm theo tên đăng nhập hoặc họ tên…',
    'admin.save': 'Lưu', 'admin.cancel': 'Hủy',
    'admin.confirmDeleteUser': 'Bạn có chắc muốn xóa người dùng "{name}"?',
    'admin.noUsers': 'Chưa có người dùng.', 'admin.loadFailed': 'Không tải được dữ liệu',
    'admin.passwordHint': 'Để trống nếu không đổi mật khẩu',
    'admin.newRole': 'Thêm vai trò', 'admin.editRole': 'Sửa vai trò', 'admin.roleCode': 'Mã vai trò',
    'admin.roleName': 'Tên vai trò', 'admin.roleDesc': 'Mô tả', 'admin.builtin': 'Hệ thống',
    'admin.userCount': 'Người dùng', 'admin.permissionCount': 'Quyền',
    'admin.confirmDeleteRole': 'Bạn có chắc muốn xóa vai trò "{name}"?',
    'admin.selectRole': 'Chọn vai trò để phân quyền', 'admin.saved': 'Đã lưu phân quyền.',
    'admin.adminFull': 'Vai trò Quản trị viên luôn có đầy đủ quyền.',
    'admin.noRoles': 'Chưa có vai trò.', 'admin.roleCodeHint': 'Chỉ gồm chữ thường, số, _ hoặc -',
    'admin.activeYes': 'Hoạt động', 'admin.activeNo': 'Đã khóa', 'admin.selectFirst': 'Chọn một vai trò ở cột bên trái.',
    'admin.companiesTab': 'Công ty', 'admin.companies': 'Danh mục công ty',
    'admin.companyCode': 'Mã công ty', 'admin.companyName': 'Tên công ty',
    'admin.companyAddress': 'Địa chỉ', 'admin.companyTaxCode': 'Mã số thuế', 'admin.companyPhone': 'Điện thoại',
    'admin.schemaName': 'Schema tenant', 'admin.companyStatus': 'Trạng thái', 'admin.createdAt': 'Ngày tạo',
    'admin.newCompany': 'Thêm công ty', 'admin.editCompany': 'Sửa công ty',
    'admin.schemaHint': 'Để trống để tự sinh từ mã công ty',
    'admin.companyActive': 'Hoạt động', 'admin.companyInactive': 'Ngừng hoạt động',
    'admin.confirmDeleteCompany': 'Bạn có chắc muốn xóa công ty "{name}" và toàn bộ dữ liệu tenant?',
    'admin.provisionNote': 'Tạo công ty sẽ tự tạo schema PostgreSQL và chạy migration cho tenant.',
    'admin.companySaved': 'Đã lưu công ty', 'admin.noData': 'Chưa có dữ liệu.',
    'admin.exportCompany': 'Xuất dữ liệu công ty (CSV ZIP)', 'admin.importCompany': 'Nhập dữ liệu công ty',
    'admin.importFile': 'Tệp sao lưu (.zip)', 'admin.importTarget': 'Công ty đích',
    'admin.importNew': 'Tạo công ty mới từ bản sao lưu', 'admin.importAction': 'Nhập dữ liệu',
    'admin.importing': 'Đang nhập…', 'admin.importProgress': 'Đang xử lý {p}%',
    'admin.importHint': 'Tệp .zip (CSV) xuất từ "Xuất dữ liệu công ty". Dữ liệu công ty đích sẽ được thay thế.',
    'admin.importDone': 'Đã nhập {rows} dòng / {tables} bảng (schema {version}).',
    'admin.cloneCompany': 'Nhân bản công ty',
    'admin.cloneHint': 'Tạo bản sao đầy đủ dữ liệu từ công ty "{name}".',
    'admin.cloneAction': 'Nhân bản', 'admin.cloning': 'Đang nhân bản…',
    'admin.cloneDone': 'Đã tạo công ty {code} ({rows} dòng / {tables} bảng).',
  },
  en: {
    'admin.title': 'Administration', 'admin.usersTab': 'Users', 'admin.rolesTab': 'Roles & permissions',
    'admin.perm': 'Permission matrix', 'admin.plugin': 'Feature',
    'admin.read': 'Read', 'admin.create': 'Create', 'admin.update': 'Update', 'admin.delete': 'Delete',
    'admin.import': 'Import', 'admin.export': 'Export',
    'admin.note': 'The Admin role always has full access. Tick to grant granular permissions to the selected role.',
    'admin.username': 'Username', 'admin.fullName': 'Full name', 'admin.password': 'Password', 'admin.avatar': 'Avatar',
    'admin.role': 'Role', 'admin.active': 'Active', 'admin.actions': 'Actions',
    'admin.newUser': 'Add user', 'admin.editUser': 'Edit user',
    'admin.searchUser': 'Search by username or full name…',
    'admin.save': 'Save', 'admin.cancel': 'Cancel',
    'admin.confirmDeleteUser': 'Are you sure you want to delete user "{name}"?',
    'admin.noUsers': 'No users yet.', 'admin.loadFailed': 'Could not load data',
    'admin.passwordHint': 'Leave blank to keep the current password',
    'admin.newRole': 'Add role', 'admin.editRole': 'Edit role', 'admin.roleCode': 'Role code',
    'admin.roleName': 'Role name', 'admin.roleDesc': 'Description', 'admin.builtin': 'System',
    'admin.userCount': 'Users', 'admin.permissionCount': 'Permissions',
    'admin.confirmDeleteRole': 'Are you sure you want to delete role "{name}"?',
    'admin.selectRole': 'Select a role to assign permissions', 'admin.saved': 'Permissions saved.',
    'admin.adminFull': 'The Admin role always has full access.',
    'admin.noRoles': 'No roles yet.', 'admin.roleCodeHint': 'Lowercase letters, digits, _ or - only',
    'admin.activeYes': 'Active', 'admin.activeNo': 'Locked', 'admin.selectFirst': 'Select a role on the left.',
    'admin.companiesTab': 'Companies', 'admin.companies': 'Company catalog',
    'admin.companyCode': 'Company code', 'admin.companyName': 'Company name',
    'admin.companyAddress': 'Address', 'admin.companyTaxCode': 'Tax code', 'admin.companyPhone': 'Phone',
    'admin.schemaName': 'Tenant schema', 'admin.companyStatus': 'Status', 'admin.createdAt': 'Created at',
    'admin.newCompany': 'Add company', 'admin.editCompany': 'Edit company',
    'admin.schemaHint': 'Leave blank to generate from company code',
    'admin.companyActive': 'Active', 'admin.companyInactive': 'Inactive',
    'admin.confirmDeleteCompany': 'Are you sure you want to delete company "{name}" and all tenant data?',
    'admin.provisionNote': 'Creating a company provisions its PostgreSQL schema and runs tenant migrations.',
    'admin.companySaved': 'Company saved', 'admin.noData': 'No data yet.',
    'admin.exportCompany': 'Export company (CSV ZIP)', 'admin.importCompany': 'Import company',
    'admin.importFile': 'Backup file (.zip)', 'admin.importTarget': 'Target company',
    'admin.importNew': 'Create a new company from the backup', 'admin.importAction': 'Import data',
    'admin.importing': 'Importing…', 'admin.importProgress': 'Processing {p}%',
    'admin.importHint': 'A .zip (CSV) file produced by "Export company". The target company data will be replaced.',
    'admin.importDone': 'Imported {rows} rows / {tables} tables (schema {version}).',
    'admin.cloneCompany': 'Clone company',
    'admin.cloneHint': 'Create a full data copy of "{name}".',
    'admin.cloneAction': 'Clone', 'admin.cloning': 'Cloning…',
    'admin.cloneDone': 'Created company {code} ({rows} rows / {tables} tables).',
  },
};

function Users({ can }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (search = q) => {
    setLoading(true);
    setError(null);
    try {
      const [users, roleList] = await Promise.all([
        adminApi.users.list({ q: search }),
        adminApi.roles.list(),
      ]);
      setRows(users?.items ?? []);
      setRoles(roleList ?? []);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const roleName = (code) => roles.find((r) => r.code === code)?.name ?? code;

  const openNew = () => setEditing({
    username: '', fullName: '', password: '', imageUrl: '',
    role: roles.find((r) => r.code === 'user')?.code ?? roles[0]?.code ?? 'user',
    active: true,
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        username: (editing.username ?? '').trim(),
        fullName: (editing.fullName ?? '').trim(),
        imageUrl: editing.imageUrl ?? '',
        role: editing.role,
        active: !!editing.active,
      };
      if (editing.password) body.password = editing.password;
      if (editing.id) await adminApi.users.update(editing.id, body);
      else await adminApi.users.create(body);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const name = row.fullName || row.username;
    if (!(await confirm(t('admin.confirmDeleteUser').replace('{name}', name)))) return;
    setError(null);
    try { await adminApi.users.remove(row.id); await load(); }
    catch (e) { setError(e?.message ?? String(e)); }
  };

  if (loading) return <Loading />;

  if (editing) {
    return (
      <div>
        <h2>{editing.id ? t('admin.editUser') : t('admin.newUser')}</h2>
        <div className="admform">
          <label>{t('admin.username')}
            <input value={editing.username} disabled={!!editing.id}
              onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
          </label>
          <label>{t('admin.fullName')}
            <input value={editing.fullName ?? ''}
              onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
          </label>
          <label>{t('admin.avatar')}
            <MediaUpload type="users" value={editing.imageUrl ?? ''}
              onChange={(url) => setEditing({ ...editing, imageUrl: url })} />
          </label>
          <label>{t('admin.password')}
            <input type="password" value={editing.password ?? ''} placeholder={t('admin.passwordHint')}
              onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
          </label>
          <label>{t('admin.role')}
            <select value={editing.role ?? ''} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
            </select>
          </label>
          <label className="admcheck">
            <input type="checkbox" checked={!!editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            {t('admin.active')}
          </label>
        </div>
        {error && <p className="formError" role="alert">{error}</p>}
        <div className="formActions">
          <button className="btn" disabled={saving || !can('admin', editing.id ? 'update' : 'create')} onClick={save}>
            {t('admin.save')}
          </button>
          <button className="tb" disabled={saving} onClick={() => { setEditing(null); setError(null); }}>
            {t('admin.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="cattools">
        <div className="searchbox">
          <span aria-hidden="true">🔍</span>
          <input type="search" value={q} placeholder={t('admin.searchUser')} aria-label={t('admin.searchUser')}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(q); }} />
        </div>
        <button type="button" className="tb" onClick={() => load(q)}>⟳ {t('common.refresh')}</button>
        {can('admin', 'create') && (
          <button type="button" className="tb" onClick={openNew}>➕ {t('admin.newUser')}</button>
        )}
      </div>
      {error && <p className="formError" role="alert">{error}</p>}
      <table className="invtable zebra">
        <thead>
          <tr>
            <th>{t('admin.username')}</th><th>{t('admin.fullName')}</th><th>{t('admin.role')}</th>
            <th>{t('admin.active')}</th><th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="medianame">
                  {row.imageUrl ? <img src={row.imageUrl} alt="" /> : null}{row.username}
                </span>
              </td>
              <td>{row.fullName || ''}</td>
              <td>{roleName(row.role)}</td>
              <td>{row.active ? t('admin.activeYes') : t('admin.activeNo')}</td>
              <td>
                {can('admin', 'update') && (
                  <button className="xbtn" title={t('admin.editUser')} aria-label={t('admin.editUser')}
                    onClick={() => setEditing({ ...row, password: '' })}>✏️</button>
                )}
                {can('admin', 'delete') && (
                  <button className="xbtn" title={t('admin.delete')} aria-label={t('admin.delete')}
                    onClick={() => remove(row)}>🗑</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="empty">{t('admin.noUsers')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Roles({ can }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (preferId) => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminApi.roles.list();
      const next = list?.find((r) => r.id === preferId)
        ?? list?.find((r) => r.id === selected?.id)
        ?? list?.find((r) => r.code === 'user')
        ?? list?.[0] ?? null;
      setRoles(list ?? []);
      setSelected(next);
      setMatrix(next ? await adminApi.roles.permissions(next.id) : {});
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectRole = async (role) => {
    setSelected(role);
    setError(null);
    setSaved(false);
    try { setMatrix(await adminApi.roles.permissions(role.id)); }
    catch (e) { setError(e?.message ?? String(e)); }
  };

  const toggle = (module, action) => {
    setSaved(false);
    setMatrix((m) => ({ ...m, [module]: { ...(m[module] ?? {}), [action]: !m[module]?.[action] } }));
  };

  const saveMatrix = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.roles.savePermissions(selected.id, matrix);
      setSaved(true);
      const list = await adminApi.roles.list();
      setRoles(list ?? []);
      setSelected((cur) => (list ?? []).find((r) => r.id === cur?.id) ?? cur);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const saveRole = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        code: (editing.code ?? '').trim(),
        name: (editing.name ?? '').trim(),
        description: (editing.description ?? '').trim(),
      };
      const roleId = editing.id;
      const saved = roleId ? await adminApi.roles.update(roleId, body) : await adminApi.roles.create(body);
      setEditing(null);
      await load(saved?.id ?? roleId);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (role) => {
    if (!(await confirm(t('admin.confirmDeleteRole').replace('{name}', role.name)))) return;
    setError(null);
    try { await adminApi.roles.remove(role.id); await load(); }
    catch (e) { setError(e?.message ?? String(e)); }
  };

  if (loading) return <Loading />;

  if (editing) {
    return (
      <div>
        <h2>{editing.id ? t('admin.editRole') : t('admin.newRole')}</h2>
        <div className="admform">
          <label>{t('admin.roleCode')}
            <input value={editing.code ?? ''} disabled={!!editing.id} placeholder={t('admin.roleCodeHint')}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
          </label>
          <label>{t('admin.roleName')}
            <input value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>{t('admin.roleDesc')}
            <input value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
        </div>
        {error && <p className="formError" role="alert">{error}</p>}
        <div className="formActions">
          <button className="btn" disabled={saving || !can('admin', editing.id ? 'update' : 'create')} onClick={saveRole}>
            {t('admin.save')}
          </button>
          <button className="tb" disabled={saving} onClick={() => { setEditing(null); setError(null); }}>
            {t('admin.cancel')}
          </button>
        </div>
      </div>
    );
  }


  const isAdminRole = selected?.code === 'admin';

  return (
    <div>
      <div className="cattools">
        {can('admin', 'create') && (
          <button type="button" className="tb" onClick={() => setEditing({ code: '', name: '', description: '' })}>
            ➕ {t('admin.newRole')}
          </button>
        )}
      </div>
      {error && <p className="formError" role="alert">{error}</p>}

      <div className="admgrid">
        <div className="admroles">
          {roles.map((role) => (
            <button key={role.id} type="button" className={selected?.id === role.id ? 'on' : ''}
              onClick={() => selectRole(role)}>
              <span>{role.name}<br /><small>{role.code}</small></span>
              <small title={t('admin.userCount')}>{role.userCount}</small>
            </button>
          ))}
          {!roles.length && <p className="muted">{t('admin.noRoles')}</p>}
        </div>

        <div>
          {!selected ? <p className="muted">{t('admin.selectFirst')}</p> : (
            <>
              <div className="ghead">
                <h2>{selected.name} <small className="muted">({selected.code})</small></h2>
                <div>
                  {can('admin', 'update') && (
                    <button className="tb" title={t('admin.editRole')} aria-label={t('admin.editRole')}
                      onClick={() => setEditing({ ...selected })}>✏️ {t('admin.editRole')}</button>
                  )}{' '}
                  {can('admin', 'delete') && !selected.builtin && (
                    <button className="tb" title={t('admin.delete')} aria-label={t('admin.delete')}
                      onClick={() => removeRole(selected)}>🗑 {t('admin.delete')}</button>
                  )}
                </div>
              </div>
              {selected.description && <p className="muted">{selected.description}</p>}
              {isAdminRole && <p className="admnote">{t('admin.adminFull')}</p>}
              <p className="muted">{t('admin.note')}</p>

              <table className="permtable">
                <thead>
                  <tr>
                    <th>{t('admin.plugin')}</th>
                    {ACTIONS.map((action) => <th key={action}>{t(ACTION_KEYS[action])}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PLUGIN_IDS.map((module) => (
                    <tr key={module}>
                      <td>{t(MODULE_KEYS[module])}</td>
                      {ACTIONS.map((action) => (
                        <td key={action}>
                          <input type="checkbox"
                            checked={isAdminRole || !!matrix[module]?.[action]}
                            disabled={isAdminRole || !can('admin', 'update')}
                            aria-label={`${t(MODULE_KEYS[module])} ${t(ACTION_KEYS[action])}`}
                            onChange={() => toggle(module, action)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="formActions">
                <button className="btn" disabled={saving || isAdminRole || !can('admin', 'update')} onClick={saveMatrix}>
                  {t('admin.save')}
                </button>
                {saved && <span className="okmark" role="status">{t('admin.saved')}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function Companies({ can }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importTarget, setImportTarget] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPct, setImportPct] = useState(0);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSource, setCloneSource] = useState(null);
  const [cloneForm, setCloneForm] = useState({ code: '', name: '' });
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState(null);
  const [cloneResult, setCloneResult] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [all, available] = await Promise.all([adminApi.companies.all(), adminApi.companies.list()]);
      setRows(all ?? []);
      setCompanies(available ?? []);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        code: (editing.code ?? '').trim(),
        name: (editing.name ?? '').trim(),
        address: (editing.address ?? '').trim(),
        taxCode: (editing.taxCode ?? '').trim(),
        phone: (editing.phone ?? '').trim(),
        schemaName: (editing.schemaName ?? '').trim(),
        status: editing.status ?? 'active',
      };
      if (editing.id) await adminApi.companies.update(editing.id, body);
      else await adminApi.companies.create(body);
      setEditing(null);
      setSaved(true);
      await load();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!(await confirm(t('admin.confirmDeleteCompany').replace('{name}', row.name)))) return;
    setError(null);
    try {
      await adminApi.companies.remove(row.id);
      if (String(getCompanyId()) === String(row.id)) setActiveCompany('');
      await load();
    } catch (e) {
      setError(e?.message ?? String(e));
    }
  };

  const exportCompany = async (row) => {
    setError(null);
    try {
      await adminApi.companies.export(row.id, row.code);
    } catch (e) {
      setError(e?.message ?? String(e));
    }
  };

  const openImport = () => {
    setImportOpen(true);
    setImportFile(null);
    setImportTarget('');
    setImportPct(0);
    setImportError(null);
    setImportResult(null);
  };

  const importCompany = async () => {
    if (!importFile || importing) return;
    setImporting(true);
    setImportPct(0);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await adminApi.companies.import(importFile, importTarget || null, setImportPct);
      setImportResult(result);
      setImportPct(100);
      setImportFile(null);
      await load(true);
    } catch (e) {
      setImportError(e?.message ?? String(e));
    } finally {
      setImporting(false);
    }
  };

  const openClone = (row) => {
    setCloneSource(row);
    setCloneForm({
      code: (row.code + '_COPY').slice(0, 50),
      name: (row.name + ' (Copy)').slice(0, 150),
    });
    setCloneError(null);
    setCloneResult(null);
    setCloneOpen(true);
  };

  const cloneCompany = async () => {
    if (!cloneSource || cloning) return;
    const code = cloneForm.code.trim();
    const name = cloneForm.name.trim();
    if (!code || !name) return;
    setCloning(true);
    setCloneError(null);
    setCloneResult(null);
    try {
      const result = await adminApi.companies.clone(cloneSource.id, { code, name });
      setCloneResult(result);
      await load(true);
    } catch (e) {
      setCloneError(e?.message ?? String(e));
    } finally {
      setCloning(false);
    }
  };

  if (loading) return <Loading />;


  if (editing) {
    return (
      <div>
        <h2>{editing.id ? t('admin.editCompany') : t('admin.newCompany')}</h2>
        <div className="admform">
          <label>{t('admin.companyCode')}
            <input value={editing.code ?? ''} disabled={!!editing.id}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
          </label>
          <label>{t('admin.companyName')}
            <input value={editing.name ?? ''}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>{t('admin.companyAddress')}
            <input value={editing.address ?? ''}
              onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          </label>
          <label>{t('admin.companyTaxCode')}
            <input value={editing.taxCode ?? ''}
              onChange={(e) => setEditing({ ...editing, taxCode: e.target.value })} />
          </label>
          <label>{t('admin.companyPhone')}
            <input value={editing.phone ?? ''}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
          </label>
          <label>{t('admin.schemaName')}
            <input value={editing.schemaName ?? ''} disabled={!!editing.id} placeholder={t('admin.schemaHint')}
              onChange={(e) => setEditing({ ...editing, schemaName: e.target.value })} />
          </label>
          <label>{t('admin.companyStatus')}
            <select value={editing.status ?? 'active'}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="active">{t('admin.companyActive')}</option>
              <option value="inactive">{t('admin.companyInactive')}</option>
            </select>
          </label>
        </div>
        {error && <p className="formError" role="alert">{error}</p>}
        <div className="formActions">
          <button className="btn" disabled={saving || !can('admin', editing.id ? 'update' : 'create')} onClick={save}>
            {t('admin.save')}
          </button>
          <button className="tb" disabled={saving} onClick={() => { setEditing(null); setError(null); }}>
            {t('admin.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="cattools">
        {can('admin', 'create') && (
          <button type="button" className="tb" onClick={() => setEditing({ code: '', name: '', address: '', taxCode: '', phone: '', schemaName: '', status: 'active' })}>
            ➕ {t('admin.newCompany')}
          </button>
        )}
        {can('admin', 'import') && (
          <button type="button" className="tb" onClick={openImport}>⬆ {t('admin.importCompany')}</button>
        )}
        <span className="muted">{t('admin.provisionNote')}</span>
      </div>
      {saved && <p className="okmark" role="status">{t('admin.companySaved')}</p>}
      {error && <p className="formError" role="alert">{error}</p>}

      <table className="invtable zebra">
        <thead>
          <tr>
            <th>{t('admin.companyCode')}</th><th>{t('admin.companyName')}</th>
            <th>{t('admin.schemaName')}</th><th>{t('admin.companyStatus')}</th>
            <th>{t('admin.createdAt')}</th><th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td><code>{row.schemaName}</code></td>
              <td>{row.status === 'active' ? t('admin.companyActive') : t('admin.companyInactive')}</td>
              <td>{String(row.createdAt ?? '').replace('T', ' ').slice(0, 19)}</td>
              <td>
                {can('admin', 'create') && (
                  <button className="xbtn" title={t('admin.cloneCompany')} aria-label={t('admin.cloneCompany')}
                    onClick={() => openClone(row)}>📋</button>
                )}
                {can('admin', 'export') && (
                  <button className="xbtn" title={t('admin.exportCompany')} aria-label={t('admin.exportCompany')}
                    onClick={() => exportCompany(row)}>⬇</button>
                )}
                {can('admin', 'update') && (
                  <button className="xbtn" title={t('admin.editCompany')} aria-label={t('admin.editCompany')}
                    onClick={() => setEditing({ ...row, schemaName: row.schemaName ?? '' })}>✏️</button>
                )}
                {can('admin', 'delete') && (
                  <button className="xbtn" title={t('admin.delete')} aria-label={t('admin.delete')}
                    onClick={() => remove(row)}>🗑</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="empty">{t('admin.noData')}</td></tr>}
        </tbody>
      </table>

      {importOpen && (
        <div className="confirm-backdrop" onMouseDown={() => !importing && setImportOpen(false)}>
          <div className="confirm-box" style={{ width: 460 }} role="dialog" aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}>
            <h3>{t('admin.importCompany')}</h3>
            <p className="muted">{t('admin.importHint')}</p>
            <div className="admform" style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: 'none' }}>
              <label>{t('admin.importFile')}
                <input type="file" accept=".zip,application/zip" disabled={importing}
                  onChange={(e) => {
                    setImportFile(e.target.files?.[0] ?? null);
                    setImportError(null);
                    setImportResult(null);
                  }} />
              </label>
              <label>{t('admin.importTarget')}
                <select value={importTarget} disabled={importing}
                  onChange={(e) => setImportTarget(e.target.value)}>
                  <option value="">{t('admin.importNew')}</option>
                  {rows.map((row) => <option key={row.id} value={String(row.id)}>{row.code} - {row.name}</option>)}
                </select>
              </label>
              {importing && (
                <>
                  <progress value={importPct} max={100} style={{ width: '100%' }} />
                  <span className="muted">{t('admin.importProgress').replace('{p}', importPct)}</span>
                </>
              )}
              {importError && <p className="formError" role="alert">{importError}</p>}
              {importResult && (
                <p className="okmark" role="status">
                  {t('admin.importDone')
                    .replace('{tables}', importResult.tables)
                    .replace('{rows}', importResult.rows)
                    .replace('{version}', importResult.schemaVersion)}
                </p>
              )}
            </div>
            <div className="confirm-actions">
              <button className="tb" disabled={importing} onClick={() => setImportOpen(false)}>{t('admin.cancel')}</button>
              <button className="btn" disabled={!importFile || importing} onClick={importCompany}>
                {importing ? t('admin.importing') : t('admin.importAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {cloneOpen && (
        <div className="confirm-backdrop" onMouseDown={() => !cloning && setCloneOpen(false)}>
          <div className="confirm-box" style={{ width: 420 }} role="dialog" aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}>
            <h3>{t('admin.cloneCompany')}</h3>
            <p className="muted">{t('admin.cloneHint').replace('{name}', cloneSource?.name ?? '')}</p>
            <div className="admform" style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: 'none' }}>
              <label>{t('admin.companyCode')}
                <input value={cloneForm.code} disabled={cloning}
                  onChange={(e) => setCloneForm({ ...cloneForm, code: e.target.value })} />
              </label>
              <label>{t('admin.companyName')}
                <input value={cloneForm.name} disabled={cloning}
                  onChange={(e) => setCloneForm({ ...cloneForm, name: e.target.value })} />
              </label>
              {cloneError && <p className="formError" role="alert">{cloneError}</p>}
              {cloneResult && (
                <p className="okmark" role="status">
                  {t('admin.cloneDone')
                    .replace('{code}', cloneResult.code)
                    .replace('{rows}', cloneResult.rows)
                    .replace('{tables}', cloneResult.tables)}
                </p>
              )}
            </div>
            <div className="confirm-actions">
              <button className="tb" disabled={cloning} onClick={() => setCloneOpen(false)}>{t('admin.cancel')}</button>
              <button className="btn" disabled={cloning || !cloneForm.code.trim() || !cloneForm.name.trim()} onClick={cloneCompany}>
                {cloning ? t('admin.cloning') : t('admin.cloneAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Body({ can }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('users');
  return (
    <div className="pad">
      <h2>{t('admin.title')}</h2>
      <div className="admtabs">
        <button type="button" className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>
          👤 {t('admin.usersTab')}
        </button>
        <button type="button" className={tab === 'roles' ? 'on' : ''} onClick={() => setTab('roles')}>
          🛡️ {t('admin.rolesTab')}
        </button>
        <button type="button" className={tab === 'companies' ? 'on' : ''} onClick={() => setTab('companies')}>
          🏢 {t('admin.companiesTab')}
        </button>
      </div>
      {tab === 'users' ? <Users can={can} /> : tab === 'roles' ? <Roles can={can} /> : <Companies can={can} />}
    </div>
  );
}

function View(props) {
  if (!props.can('admin', 'read')) return <Denied />;
  return <Body can={props.can} />;
}

export default { id: 'admin', title: 'admin.title', icon: '🛡️', order: 99, adminOnly: true, messages,
  initialState: {}, View };

