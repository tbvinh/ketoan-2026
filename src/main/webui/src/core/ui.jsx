import { useI18n } from './i18n.jsx';

export const Spinner = () => <span className="spinner" role="status" aria-label="loading" />;
export const Loading = () => <div className="loading"><Spinner /></div>;
export function RefreshBtn({ onClick }) {
  const { t } = useI18n();
  return <button className="tb" onClick={onClick}>⟳ {t('common.refresh')}</button>;
}
