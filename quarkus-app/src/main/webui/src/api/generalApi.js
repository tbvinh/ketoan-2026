import { http } from '../core/http.js';

// Query string chỉ nhận tham số có giá trị (bỏ '' / null / undefined) — FE-AP9
const toQS = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const qs = p.toString();
  return qs ? `?${qs}` : '';
};

export const generalApi = {
  // {q, type, dateFrom, dateTo, page, pageSize, sort, dir} -> { items, total }
  list: (params, opts) => http.get('/general/vouchers' + toQS(params), opts),
  get: (id) => http.get(`/general/vouchers/${id}`),
  create: (voucher) => http.post('/general/vouchers', voucher),
  update: (id, voucher) => http.put(`/general/vouchers/${id}`, voucher),
  delete: (id) => http.delete(`/general/vouchers/${id}`),
  // Bảng cân đối số phát sinh: {dateFrom, dateTo} -> { items, totals }
  trialBalance: (params, opts) => http.get('/general/trial-balance' + toQS(params), opts),
  // Lệnh xử lý: close-profit-loss | renumber | print | recalculate
  command: (name, body = {}) => http.post(`/general/commands/${name}`, body),
};

export default generalApi;
