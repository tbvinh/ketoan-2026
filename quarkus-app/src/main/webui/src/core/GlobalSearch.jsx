import { useApi } from './api.js';
import { addMessages, useI18n } from './i18n.jsx';
import { Loading } from './ui.jsx';

addMessages({
  vi: { 'search.placeholder': 'Tìm trong tất cả (nhấn Enter)', 'search.results': 'Kết quả cho', 'search.close': 'Đóng', 'search.none': 'Không có kết quả.' },
  en: { 'search.placeholder': 'Search everything (press Enter)', 'search.results': 'Results for', 'search.close': 'Close', 'search.none': 'No results.' },
});

function Group({ plugin, query, onOpen }) {
  const { t } = useI18n();
  const { data, loading } = useApi(() => plugin.search(query), [query]);
  return (
    <section className="sgroup">
      <h3>{plugin.icon} {t(plugin.title)}{!loading && ` (${data.length})`}</h3>
      {loading ? <Loading /> : !data.length ? <p className="empty">{t('search.none')}</p> : data.map((r) => (
        <button key={r.id} className="sitem" onClick={() => onOpen(plugin, r)}>
          <b>{r.title}</b><span className="muted">{t(r.subtitle)}</span>
        </button>
      ))}
    </section>
  );
}

export default function GlobalSearch({ query, plugins, can, onOpen, onClose }) {
  const { t } = useI18n();
  // chỉ tìm trong plugin mà user có quyền "read"
  const searchable = plugins.filter((p) => p.search && can(p.id, 'read'));
  return (
    <div className="pad gsearch">
      <div className="ghead">
        <h2>{t('search.results')} “{query}”</h2>
        <button className="tb" onClick={onClose}>✕ {t('search.close')}</button>
      </div>
      {searchable.map((p) => <Group key={p.id} plugin={p} query={query} onOpen={onOpen} />)}
    </div>
  );
}
