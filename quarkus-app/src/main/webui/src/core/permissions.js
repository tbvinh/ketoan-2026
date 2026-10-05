import { useSyncExternalStore } from 'react';

// Ma trận quyền CRUD áp dụng cho vai trò "user". Vai trò "admin" luôn full quyền,
// không lưu trong bảng này và không thể bị khóa.
export const PLUGIN_IDS = ['mail', 'calendar', 'people', 'tasks', 'inventory', 'catalog'];
export const ACTIONS = ['read', 'create', 'update', 'delete'];

const DEFAULT = {
  mail:     { read: true, create: true, update: true,  delete: false },
  calendar: { read: true, create: true, update: true,  delete: false },
  people:   { read: true, create: true, update: false, delete: false },
  tasks:    { read: true, create: true, update: true,  delete: true },
  inventory:{ read: true, create: true, update: true,  delete: false },
  catalog:  { read: true, create: true, update: true,  delete: true },
};

function load() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('perms_user') || '{}') }; }
  catch { return DEFAULT; }
}
let perms = load();
const subs = new Set();

export function togglePerm(pluginId, action) {
  perms = { ...perms, [pluginId]: { ...perms[pluginId], [action]: !perms[pluginId][action] } };
  localStorage.setItem('perms_user', JSON.stringify(perms));
  subs.forEach((f) => f());
}

export const usePermissions = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => perms);
