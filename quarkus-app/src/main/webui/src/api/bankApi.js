import { http } from '../core/http.js';

// Query string chỉ nhận tham số có giá trị (bỏ '' / null / undefined) — FE-AP9
const toQS = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const qs = p.toString();
  return qs ? `?${qs}` : '';
};

export const bankApi = {
  // {q, type, bankId, dateFrom, dateTo, page, pageSize, sort, dir} -> { items, total }
  list: (params, opts) => http.get('/bank/vouchers' + toQS(params), opts),
  get: (id) => http.get(`/bank/vouchers/${id}`),
  create: (voucher) => http.post('/bank/vouchers', voucher),
  update: (id, voucher) => http.put(`/bank/vouchers/${id}`, voucher),
  delete: (id) => http.delete(`/bank/vouchers/${id}`),
  // Sổ tiền gửi: {bankId, dateFrom, dateTo} -> { opening, totalIn, totalOut, closing, items }
  ledger: (params, opts) => http.get('/bank/ledger' + toQS(params), opts),
};

export default bankApi;
