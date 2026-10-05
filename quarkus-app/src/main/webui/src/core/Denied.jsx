import { useI18n } from './i18n.jsx';
export default function Denied() {
  const { t } = useI18n();
  return <p className="denied">🔒 {t('perm.denied')}</p>;
}
