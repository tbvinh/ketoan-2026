import { useSyncExternalStore } from 'react';

const KEY = 'active_company';

let active = localStorage.getItem(KEY) || '';
let companies = [];
const subs = new Set();
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((fn) => fn());

export const getCompanyId = () => active;

export const tenantHeaders = () => (active ? { 'X-Company-Id': active } : {});

export function setActiveCompany(id) {
  active = id == null ? '' : String(id);
  if (active) localStorage.setItem(KEY, active);
  else localStorage.removeItem(KEY);
  emit();
}

export function setCompanies(list) {
  companies = Array.isArray(list) ? list : [];
  if (active && !companies.some((c) => String(c.id) === String(active))) {
    active = '';
    localStorage.removeItem(KEY);
  }
  emit();
}

export function clearTenant() {
  active = '';
  companies = [];
  localStorage.removeItem(KEY);
  emit();
}

export const useTenant = () =>
  useSyncExternalStore(subscribe, () => active, () => active);

export const useCompanies = () =>
  useSyncExternalStore(subscribe, () => companies, () => companies);

// Cong ty dang chon (hoac cong ty dau tien) — dung cho tieu de ban in.
export const getActiveCompany = () =>
  companies.find((c) => String(c.id) === String(active)) ?? companies[0] ?? null;

