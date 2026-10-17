import { apiFetch, API_BASE, handleUnauthorized } from '../core/api.js';
import { downloadFile } from '../core/http.js';
import { tenantHeaders } from '../core/tenant.js';

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const query = p.toString();
  return query ? `?${query}` : '';
};

// Upload kèm tiến trình (XHR cho phép theo dõi upload.onprogress).
function uploadPackage(path, file, companyId, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + path);
    xhr.withCredentials = true;
    Object.entries(tenantHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onload = () => {
      if (xhr.status === 401) handleUnauthorized();
      let data = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { data = xhr.responseText; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.message ?? data?.error ?? xhr.statusText));
    };
    const form = new FormData();
    form.append('file', file);
    if (companyId) form.append('companyId', String(companyId));
    xhr.send(form);
  });
}

export const adminApi = {
  users: {
    list: (params) => apiFetch('/api/users' + qs(params)),
    get: (id) => apiFetch(`/api/users/${id}`),
    create: (body) => apiFetch('/api/users', { method: 'POST', body }),
    update: (id, body) => apiFetch(`/api/users/${id}`, { method: 'PUT', body }),
    remove: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  },
  roles: {
    list: () => apiFetch('/api/roles'),
    create: (body) => apiFetch('/api/roles', { method: 'POST', body }),
    update: (id, body) => apiFetch(`/api/roles/${id}`, { method: 'PUT', body }),
    remove: (id) => apiFetch(`/api/roles/${id}`, { method: 'DELETE' }),
    permissions: (id) => apiFetch(`/api/roles/${id}/permissions`),
    savePermissions: (id, permissions) => apiFetch(`/api/roles/${id}/permissions`, { method: 'PUT', body: permissions }),
  },
  permissions: {
    list: () => apiFetch('/api/permissions'),
  },
  companies: {
    list: () => apiFetch('/api/companies'),
    all: () => apiFetch('/api/companies/all'),
    create: (body) => apiFetch('/api/companies', { method: 'POST', body }),
    update: (id, body) => apiFetch(`/api/companies/${id}`, { method: 'PUT', body }),
    remove: (id) => apiFetch(`/api/companies/${id}`, { method: 'DELETE' }),
    export: (id, code) => downloadFile(`/company/${id}/export`, `company-${code || id}.zip`),
    import: (file, companyId, onProgress) => uploadPackage('/api/company/import', file, companyId, onProgress),
    clone: (id, body) => apiFetch(`/api/company/${id}/clone`, { method: 'POST', body }),
  },
};

export default adminApi;
