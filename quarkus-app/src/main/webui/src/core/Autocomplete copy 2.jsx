import { useEffect, useRef, useState } from 'react';
import { Spinner } from './ui.jsx';
import { useI18n } from './i18n.jsx';

/**
 * Ô chọn có gợi ý, gọi API giả mỗi khi gõ (debounce nhẹ).
 * value:   {id, name, ...} đang chọn, hoặc null
 * onChange(opt): opt là {id,name,...} khi chọn, hoặc null khi xóa/gõ lại
 * fetcher(q): trả Promise<[{id,name,hint?}]>
 * onCreate(name): (tùy chọn) tạo mới bản ghi ngay trong danh mục và trả {id,name,...}
 */
export default function Autocomplete({ value, onChange, fetcher, placeholder, disabled, onCreate, createLabel }) {
  const [q, setQ] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const box = useRef(null);
  const { t } = useI18n();

  useEffect(() => { setQ(value?.name ?? ''); }, [value?.id]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const h = setTimeout(() => {
      fetcher(q).then((r) => { if (alive) { setOpts(r); setLoading(false); } });
    }, 250);
    return () => { alive = false; clearTimeout(h); };
  }, [q, open]);

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const create = async () => {
    setCreating(true);
    const made = await onCreate(q.trim());
    setCreating(false);
    if (made) { onChange(made); setQ(made.name); }
    setOpen(false);
  };

  return (
    <div className="ac" ref={box}>
      <input disabled={disabled} value={q} placeholder={placeholder} autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); if (value) onChange(null); }} />
      {open && !disabled && (
        <div className="ac-pop">
          {loading ? <div className="ac-row"><Spinner /></div> : (<>
            {opts.map((o) => (
              <button key={o.id} type="button" className="ac-row ac-item"
                onMouseDown={() => { onChange(o); setQ(o.name); setOpen(false); }}>
                <span>{o.name}</span>{o.hint && <small>{o.hint}</small>}
              </button>
            ))}
            {!opts.length && !onCreate && <div className="ac-row muted">{t('ac.empty')}</div>}
            {onCreate && q.trim() && (
              <button type="button" className="ac-row ac-item ac-create" disabled={creating} onMouseDown={create}>
                {creating ? <Spinner /> : `➕ ${createLabel ?? t('ac.create')} “${q.trim()}”`}
              </button>
            )}
          </>)}
        </div>
      )}
    </div>
  );
}