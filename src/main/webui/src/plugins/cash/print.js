// Bản in phiếu thu / phiếu chi (A5) — dựng HTML rồi in bằng iframe ẩn như phiếu kho.
import { cashApi } from '../../api/cashApi.js';
import { getActiveCompany } from '../../core/tenant.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => Number(n || 0).toLocaleString('vi-VN');
const TITLES = { receipt: 'cash.printReceipt', payment: 'cash.printPayment', exchange: 'cash.exchange' };
const FORMS = { receipt: '01 - TT', payment: '02 - TT', exchange: '03 - TT' };

export function cashVoucherHtml(doc, t, company) {
  const d = doc ?? {};
  const type = d.type === 'payment' || d.type === 'exchange' ? d.type : 'receipt';
  const payment = type === 'payment';
  const [y = '', m = '', day = ''] = String(d.date ?? '').split('-');
  const c = company ?? d.company ?? {};
  const title = t(TITLES[type]);
  const form = FORMS[type] ?? FORMS.receipt;
  const partnerLabel = t(payment ? 'cash.printPayee' : 'cash.printPayer');
  const reasonLabel = t(payment ? 'cash.printReasonPayment' : 'cash.printReasonReceipt');
  const account = d.accountCode
    ? esc(d.accountCode) + (d.accountName ? ' - ' + esc(d.accountName) : '')
    : '';
  const words = d.amountInWords || '';
  const companyName = c.name || t('cash.printCompany');
  const contact = [
    c.phone ? `${esc(t('cash.printPhone'))}: ${esc(c.phone)}` : '',
    c.taxCode ? `${esc(t('cash.printTax'))}: ${esc(c.taxCode)}` : '',
  ].filter(Boolean).join(' &nbsp; ');
  const foreign = d.currency && d.currency !== 'VND'
    ? `<div>${esc(t('cash.currency'))}: ${money(d.amountCurrency)} ${esc(d.currency)} × ${money(d.fxRate)}</div>`
    : '';

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${esc(d.code ?? title)}</title>
<style>
  @page { size: A5 portrait; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Times New Roman", serif; font-size: 11.5pt; line-height: 1.35; color: #000; }
  .head { display: flex; justify-content: space-between; gap: 10px; }
  .company { max-width: 60%; }
  .company .name { font-weight: 700; text-transform: uppercase; }
  .form { width: 40%; text-align: center; font-size: 8.5pt; line-height: 1.3; }
  h1 { margin: 9px 0 1px; text-align: center; font-size: 16pt; letter-spacing: .5px; text-transform: uppercase; }
  .date { text-align: center; font-style: italic; font-size: 10.5pt; }
  .meta { display: flex; justify-content: space-between; align-items: flex-start; margin: 8px 0 2px; }
  .meta .no { font-size: 11.5pt; }
  .meta .acc { font-size: 10.5pt; min-width: 42%; }
  .info { margin-top: 4px; }
  .info div { margin: 4px 0; }
  .info .amount { font-size: 12pt; }
  .words { font-style: italic; }
  .received { margin-top: 7px; font-style: italic; }
  .sigs { display: flex; justify-content: space-between; margin-top: 14px; text-align: center; }
  .sig { width: 19%; }
  .sig b { display: block; font-size: 10pt; }
  .sig i { display: block; font-size: 8.5pt; margin-bottom: 48px; }
</style></head>
<body>
  <div class="head">
    <div class="company">
      <div class="name">${esc(companyName)}</div>
      ${c.address ? `<div>${esc(t('cash.printAddress'))}: ${esc(c.address)}</div>` : ''}
      ${contact ? `<div>${contact}</div>` : ''}
    </div>
    <div class="form">
      <div>${esc(t('cash.printForm').replace('{no}', form))}</div>
      <div>${esc(t('cash.printFormRef'))}</div>
    </div>
  </div>
  <h1>${esc(title)}</h1>
  <div class="date">${esc(t('cash.printDate').replace('{d}', day).replace('{m}', m).replace('{y}', y))}</div>
  <div class="meta">
    <div class="no">${esc(t('cash.printNo'))}: <b>${esc(d.code ?? '')}</b></div>
    <div class="acc">
      <div>${esc(t('cash.printDebit'))}: ${payment ? '' : account}</div>
      <div>${esc(t('cash.printCredit'))}: ${payment ? account : ''}</div>
    </div>
  </div>
  <div class="info">
    <div>${esc(partnerLabel)}: <b>${esc(d.partnerName ?? '')}</b></div>
    <div>${esc(t('cash.printAddress'))}: ${esc(d.partnerAddress ?? '')}</div>
    <div>${esc(reasonLabel)}: ${esc(d.name ?? '')}</div>
    <div class="amount">${esc(t('cash.printAmount'))}: <b>${money(d.amount)} đ</b></div>
    <div class="words">${esc(t('cash.printAmountWords'))}: <i>${esc(words)}</i></div>
    ${foreign}
    ${d.sourceDocNo ? `<div>${esc(t('cash.sourceDoc'))}: ${esc(d.sourceDocNo)}</div>` : ''}
  </div>
  ${payment ? '' : `<div class="received">${esc(t('cash.printReceived'))}: <i>${esc(words)}</i></div>`}
  <div class="sigs">
    <div class="sig"><b>${esc(t('cash.printPreparer'))}</b><i>${esc(t('cash.printSignHint'))}</i></div>
    <div class="sig"><b>${esc(t(payment ? 'cash.printPayeeSign' : 'cash.printPayerSign'))}</b><i>${esc(t('cash.printSignHint'))}</i></div>
    <div class="sig"><b>${esc(t('cash.printCashier'))}</b><i>${esc(t('cash.printSignHint'))}</i></div>
    <div class="sig"><b>${esc(t('cash.printChiefAccountant'))}</b><i>${esc(t('cash.printSignHint'))}</i></div>
    <div class="sig"><b>${esc(t('cash.printDirector'))}</b><i>${esc(t('cash.printSignHint'))}</i></div>
  </div>
</body></html>`;
}


// In bằng iframe ẩn: hộp thoại in của trình duyệt hiển thị đúng bản in (xem trước) rồi in.
export async function printCashVoucher(voucher, t) {
  let doc = voucher;
  if (voucher?.id) {
    try { doc = { ...voucher, ...(await cashApi.get(voucher.id)) }; }
    catch { /* giữ dữ liệu đang có trên màn hình */ }
  }
  const company = { ...(getActiveCompany() ?? {}), ...(doc.company ?? {}) };
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const w = frame.contentWindow;
  w.document.open();
  w.document.write(cashVoucherHtml(doc, t, company));
  w.document.close();
  const fire = () => {
    try { w.focus(); w.print(); } finally { setTimeout(() => frame.remove(), 1500); }
  };
  if (frame.contentDocument?.readyState === 'complete') setTimeout(fire, 80);
  else frame.addEventListener('load', () => setTimeout(fire, 80), { once: true });
}
