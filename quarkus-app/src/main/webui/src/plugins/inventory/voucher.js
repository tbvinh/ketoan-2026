// Bản in phiếu kho (A4) dùng chung cho nhập / xuất / điều chuyển / trả hàng.
// Chỉ dựng HTML + CSS rồi in bằng iframe ẩn — không cần thư viện ngoài.

import { apiFetch } from '../../core/api.js';
import { getActiveCompany, setCompanies } from '../../core/tenant.js';

const TYPES = {
  import:   { title: 'inv.voucherImport',   form: '01 - VT', whIn: true,  whOut: false, partner: 'inv.voucherDeliverer', sign: 'inv.deliverer' },
  export:   { title: 'inv.voucherExport',   form: '02 - VT', whIn: false, whOut: true,  partner: 'inv.voucherReceiver',  sign: 'inv.receiver' },
  transfer: { title: 'inv.voucherTransfer', form: '03 - VT', whIn: true,  whOut: true,  partner: 'inv.partner',          sign: 'inv.receiver' },
  return:   { title: 'inv.voucherReturn',   form: '01 - VT', whIn: true,  whOut: false, partner: 'inv.voucherDeliverer', sign: 'inv.deliverer' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => Number(n || 0).toLocaleString('vi-VN');
const docLines = (doc) => (Array.isArray(doc?.lines) ? doc.lines : []);
const amount = (l) => (Number(l?.qty) || 0) * (Number(l?.price) || 0);

export function voucherHtml(doc, t, company) {
  const kind = TYPES[doc?.type] ?? TYPES.import;
  const [y = '', m = '', d = ''] = String(doc?.date ?? '').split('-');
  const rows = docLines(doc);
  const totalQty = rows.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const total = rows.reduce((s, l) => s + amount(l), 0);
  const c = company ?? {};
  const companyName = c.name || t('inv.voucherCompany');
  const addressLine = c.address
    ? `${esc(t('inv.voucherAddressLabel'))}: ${esc(c.address)}`
    : esc(t('inv.voucherAddress'));
  const taxLine = c.taxCode ? `${esc(t('inv.voucherTax'))}: ${esc(c.taxCode)}` : '';
  const phoneLine = c.phone
    ? `${esc(t('inv.voucherPhoneLabel'))}: ${esc(c.phone)}`
    : esc(t('inv.voucherPhone'));

  const warehouses = [];
  if (kind.whOut && doc?.warehouseOut?.name) warehouses.push(`${t('inv.warehouseOut')}: <b>${esc(doc.warehouseOut.name)}</b>`);
  if (kind.whIn && doc?.warehouseIn?.name) warehouses.push(`${t('inv.warehouseIn')}: <b>${esc(doc.warehouseIn.name)}</b>`);

  const items = rows.map((l, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(l.product?.name ?? '')}</td>
      <td class="n">${money(l.qty)}</td>
      <td class="n">${money(l.price)}</td>
      <td class="n">${money(amount(l))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${esc(doc?.no ?? t(kind.title))}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Times New Roman", serif; font-size: 13px; color: #000; }
  .head { display: flex; justify-content: space-between; gap: 20px; }
  .company { font-weight: 700; text-transform: uppercase; }
  .form { text-align: center; font-size: 11.5px; line-height: 1.35; }
  h1 { margin: 16px 0 2px; text-align: center; font-size: 20px; letter-spacing: .5px; }
  .date { text-align: center; font-style: italic; margin-bottom: 8px; }
  .meta { display: flex; justify-content: space-between; margin: 4px 0; }
  .info div { margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #000; padding: 4px 6px; }
  th { text-align: center; background: #f2f2f2; font-weight: 700; }
  td.c { text-align: center; width: 36px; }
  td.n { text-align: right; white-space: nowrap; }
  tfoot td { font-weight: 700; }
  .note { margin-top: 6px; font-style: italic; }
  .sigs { display: flex; justify-content: space-between; margin-top: 26px; text-align: center; }
  .sig { width: 24%; }
  .sig b { display: block; }
  .sig i { display: block; font-size: 11.5px; margin-bottom: 58px; }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="company">${esc(companyName)}</div>
      <div>${addressLine}</div>
      ${taxLine ? `<div>${taxLine}</div>` : ''}
      <div>${phoneLine}</div>
    </div>
    <div class="form">${esc(t('inv.voucherForm').replace('{no}', kind.form))}<br/>${esc(t('inv.voucherFormRef'))}</div>
  </div>
  <h1>${esc(t(kind.title))}</h1>
  <div class="date">${esc(t('inv.voucherDate').replace('{d}', d).replace('{m}', m).replace('{y}', y))}</div>
  <div class="meta"><span>${esc(t('inv.no'))}: <b>${esc(doc?.no ?? '')}</b></span></div>
  <div class="info">
    <div>${esc(t(kind.partner))}: <b>${esc(doc?.partner?.name ?? '')}</b></div>
    ${warehouses.map((x) => `<div>${x}</div>`).join('')}
    ${doc?.bank?.name ? `<div>${esc(t('inv.bank'))}: ${esc(doc.bank.name)}</div>` : ''}
  </div>
  <table>
    <thead><tr>
      <th>${esc(t('inv.stt'))}</th><th>${esc(t('inv.product'))}</th>
      <th>${esc(t('inv.qty'))}</th><th>${esc(t('inv.price'))}</th><th>${esc(t('inv.lineTotal'))}</th>
    </tr></thead>
    <tbody>${items || `<tr><td colspan="5" class="c">${esc(t('inv.empty'))}</td></tr>`}</tbody>
    <tfoot><tr>
      <td colspan="2" style="text-align:right">${esc(t('inv.grandTotal'))}</td>
      <td class="n">${money(totalQty)}</td><td></td><td class="n">${money(total)}</td>
    </tr></tfoot>
  </table>
  ${doc?.note ? `<div class="note">${esc(t('inv.note'))}: ${esc(doc.note)}</div>` : ''}
  <div class="sigs">
    <div class="sig"><b>${esc(t('inv.createdBy'))}</b><i>${esc(t('inv.signHint'))}</i></div>
    <div class="sig"><b>${esc(t(kind.sign))}</b><i>${esc(t('inv.signHint'))}</i></div>
    <div class="sig"><b>${esc(t('inv.keeper'))}</b><i>${esc(t('inv.signHint'))}</i></div>
    <div class="sig"><b>${esc(t('inv.chiefAccountant'))}</b><i>${esc(t('inv.signHint'))}</i></div>
  </div>
</body></html>`;
}

// Lấy công ty đang chọn từ phiên; nếu thiếu thông tin in thì nạp lại từ API.
async function resolveCompany() {
  let company = getActiveCompany();
  if (company && (company.address || company.taxCode || company.phone)) return company;
  try {
    const list = await apiFetch('/api/companies', { silent401: true });
    if (Array.isArray(list)) {
      setCompanies(list);
      company = getActiveCompany() ?? company;
    }
  } catch { /* giữ dữ liệu phiên hiện có */ }
  return company;
}

// In bằng iframe ẩn: hộp thoại in của trình duyệt hiển thị đúng bản in (xem trước) rồi in.
export async function printVoucher(doc, t) {
  const company = await resolveCompany();
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const w = frame.contentWindow;
  w.document.open();
  w.document.write(voucherHtml(doc, t, company));
  w.document.close();
  const fire = () => {
    try { w.focus(); w.print(); } finally { setTimeout(() => frame.remove(), 1500); }
  };
  if (frame.contentDocument?.readyState === 'complete') setTimeout(fire, 80);
  else frame.addEventListener('load', () => setTimeout(fire, 80), { once: true });
}
