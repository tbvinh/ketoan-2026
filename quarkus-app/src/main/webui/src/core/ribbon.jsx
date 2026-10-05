import { addMessages, useI18n } from './i18n.jsx';

addMessages({
  vi: { 'ribbon.file': 'Tệp', 'ribbon.layout': 'Bố cục', 'ribbon.navpane': 'Ngăn điều hướng', 'ribbon.home': 'Trang chủ', 'ribbon.view': 'Xem', 'ribbon.help': 'Trợ giúp', 'ribbon.account': 'Tài khoản', 'ribbon.actions': 'Thao tác', 'ribbon.language': 'Ngôn ngữ', 'ribbon.print': 'In', 'ribbon.about': 'Giới thiệu' },
  en: { 'ribbon.file': 'File', 'ribbon.layout': 'Layout', 'ribbon.navpane': 'Navigation pane', 'ribbon.home': 'Home', 'ribbon.view': 'View', 'ribbon.help': 'Help', 'ribbon.account': 'Account', 'ribbon.actions': 'Actions', 'ribbon.language': 'Language', 'ribbon.print': 'Print', 'ribbon.about': 'About' },
});

// Menu item (tab) + button dùng chung, luôn hiển thị
export const commonTabs = ({ logout, refresh, lang, setLang, navOpen, toggleNav }) => [
  { id: 'file', title: 'ribbon.file', groups: [{ id: 'account', title: 'ribbon.account', items: [
    { id: 'logout', icon: '🚪', label: 'logout', onClick: logout }] }] },
  { id: 'home', title: 'ribbon.home', groups: [{ id: 'common', title: 'ribbon.actions', items: [
    { id: 'refresh', icon: '⟳', label: 'common.refresh', onClick: refresh },
    { id: 'print', icon: '🖨', label: 'ribbon.print', onClick: () => window.print() }] }] },
  { id: 'view', title: 'ribbon.view', groups: [{ id: 'layout', title: 'ribbon.layout', items: [
    { id: 'nav', icon: '🗂', label: 'ribbon.navpane', active: navOpen, onClick: toggleNav }] },
  { id: 'lang', title: 'ribbon.language', items: [
    { id: 'vi', icon: '🇻🇳', label: 'Tiếng Việt', active: lang === 'vi', onClick: () => setLang('vi') },
    { id: 'en', icon: '🇬🇧', label: 'English', active: lang === 'en', onClick: () => setLang('en') }] }] },
  { id: 'help', title: 'ribbon.help', groups: [{ id: 'about', title: 'ribbon.about', items: [
    { id: 'about', icon: 'ℹ️', label: 'ribbon.about', onClick: () => alert('Ke toan 1.0') }] }] },
];

/**
 * Gộp phần chung + phần plugin đóng góp:
 *   extra.tabs   -> chèn thêm menu item (tab) sau "Home"
 *   extra.groups -> { [tabId]: [group] } chèn thêm nhóm nút vào tab có sẵn
 */
export function buildTabs(common, extra = {}) {
  const tabs = common.map((t) => ({ ...t, groups: [...t.groups, ...(extra.groups?.[t.id] ?? [])] }));
  tabs.splice(2, 0, ...(extra.tabs ?? []).map((t) => ({ ...t, plugin: true })));
  return tabs;
}

export default function Ribbon({ tabs, tab, setTab }) {
  const { t } = useI18n();
  const cur = tabs.find((x) => x.id === tab) ?? tabs[1];
  return (
    <div className="ribbon">
      <div className="tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === cur.id}
            className={'rtab' + (x.id === cur.id ? ' on' : '') + (x.plugin ? ' plug' : '')} onClick={() => setTab(x.id)}>
            {t(x.title)}
          </button>
        ))}
      </div>
      <div className="strip">
        {cur.groups.map((g) => (
          <div key={g.id} className="grp">
            <div className="btns">
              {g.items.map((i) => i.render ? <span key={i.id}>{i.render()}</span> : (
                <button key={i.id} className={'rbtn' + (i.active ? ' on' : '')} disabled={i.disabled} onClick={i.onClick}>
                  <span className="ri">{i.icon}</span>{t(i.label)}
                </button>
              ))}
            </div>
            <div className="gt">{t(g.title)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
