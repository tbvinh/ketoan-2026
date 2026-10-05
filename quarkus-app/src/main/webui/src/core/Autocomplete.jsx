import { useEffect, useRef, useState } from 'react';
import { Spinner } from './ui.jsx';
import { useI18n } from './i18n.jsx';

// Chuẩn hóa để so tên: bỏ dấu tiếng Việt, hoa/thường, khoảng trắng thừa
const norm = (s) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'd').replace(/\s+/g, ' ').toLowerCase().trim();

/**
 * Ô chọn có gợi ý, gọi API giả mỗi khi gõ (debounce nhẹ).
 * value:   {id, name, ...} đang chọn, hoặc null
 * onChange(opt): opt là {id,name,...} khi chọn, hoặc null khi xóa/gõ lại
 * fetcher(q): trả Promise<[{id,name,hint?}]>
 * onCreate(name): (tùy chọn) tạo mới bản ghi ngay trong danh mục và trả {id,name,...}
 */
export default function Autocomplete({ value, onChange, fetcher, placeholder, disabled, onCreate, createLabel }) {
  const [q, setQ] = useState(value?.name ?? '');
  const [dirty, setDirty] = useState(false);   // true = người dùng đã gõ; false = q chỉ là tên đang chọn
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const box = useRef(null);
  const { t } = useI18n();

  // Đồng bộ khi cha đổi value. Có value -> hiện tên; value bị xóa từ bên ngoài -> xóa ô,
  // nhưng không xóa khi chính người dùng đang gõ (onChange(null) do gõ gây ra).
  useEffect(() => {
    if (value) { setQ(value.name); setDirty(false); }
    else if (!dirty) setQ('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.id]);

  // Chưa gõ thì tìm rỗng (hiện gợi ý chung) thay vì tìm theo tên đang chọn
  const query = dirty ? q : '';

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const h = setTimeout(() => {
      fetcher(query)
        .then((r) => { if (alive) { setOpts(r); setLoading(false); } })
        .catch(() => { if (alive) { setOpts([]); setLoading(false); } });
    }, 250);
    return () => { alive = false; clearTimeout(h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (o) => { onChange(o); setQ(o.name); setDirty(false); setOpen(false); };

  const name = q.trim();
  // Đã tồn tại: trùng tên với mục trong kết quả, hoặc với mục đang chọn -> không cho tạo mới
  const exists = !!name && (opts.some((o) => norm(o.name) === norm(name)) || norm(value?.name) === norm(name));
  const showCreate = !!onCreate && dirty && !!name && !loading && !exists;

  const create = async () => {
    if (creating) return;   // chặn bấm đúp
    setCreating(true);
    try {
      const made = await onCreate(name);
      if (made) pick(made); else setOpen(false);
    } catch (e) {
      alert(e?.message ?? String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="ac" ref={box}>
      <input disabled={disabled} value={q} placeholder={placeholder} autoComplete="off"
        onFocus={(e) => { e.target.select(); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setDirty(true); setOpen(true); if (value) onChange(null); }} />
      {open && !disabled && (
        <div className="ac-pop">
          {loading ? <div className="ac-row"><Spinner /></div> : (<>
            {opts.map((o) => (
              <button key={o.id} type="button" className="ac-row ac-item"
                onMouseDown={() => pick(o)}>
                <span>{o.name}</span>{o.hint && <small>{o.hint}</small>}
              </button>
            ))}
            {!opts.length && !showCreate && <div className="ac-row muted">{t('ac.empty')}</div>}
            {showCreate && (
              <button type="button" className="ac-row ac-item ac-create" disabled={creating} onMouseDown={create}>
                {creating ? <Spinner /> : `➕ ${createLabel ?? t('ac.create')} “${name}”`}
              </button>
            )}
          </>)}
        </div>
      )}
    </div>
  );
}