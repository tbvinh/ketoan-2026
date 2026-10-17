import { useEffect, useRef, useState } from 'react';
import { addMessages, useI18n } from './i18n.jsx';

addMessages({
  vi: { 'ribbon.file': 'Tệp', 'ribbon.layout': 'Bố cục', 'ribbon.navpane': 'Ngăn điều hướng', 'ribbon.home': 'Trang chủ', 'ribbon.view': 'Xem', 'ribbon.help': 'Trợ giúp', 'ribbon.account': 'Tài khoản', 'ribbon.actions': 'Thao tác', 'ribbon.language': 'Ngôn ngữ', 'ribbon.print': 'In', 'ribbon.about': 'Giới thiệu', 'ribbon.collapse': 'Thu gọn ribbon', 'ribbon.expand': 'Mở rộng ribbon' },
  en: { 'ribbon.file': 'File', 'ribbon.layout': 'Layout', 'ribbon.navpane': 'Navigation pane', 'ribbon.home': 'Home', 'ribbon.view': 'View', 'ribbon.help': 'Help', 'ribbon.account': 'Account', 'ribbon.actions': 'Actions', 'ribbon.language': 'Language', 'ribbon.print': 'Print', 'ribbon.about': 'About', 'ribbon.collapse': 'Collapse ribbon', 'ribbon.expand': 'Expand ribbon' },
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
  // Thu gọn ribbon giống MS Word: chỉ còn hàng tab, bấm tab để xem tạm (overlay)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ribbonCollapsed') === '1');
  const [peek, setPeek] = useState(false);
  const root = useRef(null);
  const cur = tabs.find((x) => x.id === tab) ?? tabs[1];

  const setPinned = (next) => {
    setCollapsed(next);
    localStorage.setItem('ribbonCollapsed', next ? '1' : '0');
    setPeek(false);
  };

  const openTab = (id) => {
    if (!collapsed) { setTab(id); return; }
    if (id === cur.id) setPeek((p) => !p);
    else { setTab(id); setPeek(true); }
  };

  // Nhấp đúp vào tab: thu gọn (đang mở) hoặc ghim mở lại (đang thu gọn)
  const dblTab = (id) => {
    if (collapsed) setPinned(false);
    else if (id === cur.id) setPinned(true);
  };

  useEffect(() => {
    if (!collapsed || !peek) return undefined;
    const outside = (e) => { if (!root.current?.contains(e.target)) setPeek(false); };
    const esc = (e) => { if (e.key === 'Escape') setPeek(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [collapsed, peek]);

  return (
    <div className={'ribbon' + (collapsed ? ' collapsed' : '')} ref={root}>
      <div className="rtabs">
        <div className="tabs" role="tablist">
          {tabs.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === cur.id}
              className={'rtab' + (x.id === cur.id ? ' on' : '') + (x.plugin ? ' plug' : '')}
              onClick={() => openTab(x.id)} onDoubleClick={() => dblTab(x.id)}>
              {t(x.title)}
            </button>
          ))}
        </div>
        <button type="button" className="rpin" aria-expanded={!collapsed} aria-controls="ribbon-strip"
          title={collapsed ? t('ribbon.expand') : t('ribbon.collapse')}
          aria-label={collapsed ? t('ribbon.expand') : t('ribbon.collapse')}
          onClick={() => setPinned(!collapsed)}>
          {collapsed ? '⌄' : '📌'}
        </button>
      </div>
      {(!collapsed || peek) && (
        <div className={'strip' + (collapsed ? ' peek' : '')} id="ribbon-strip" role="tabpanel">
          {cur.groups.map((g) => (
            <div key={g.id} className="grp">
              <div className="btns">
                {g.items.map((i) => i.render ? <span key={i.id}>{i.render()}</span> : (
                  <button key={i.id} className={'rbtn' + (i.active ? ' on' : '')} disabled={i.disabled}
                    onClick={() => { i.onClick?.(); if (collapsed) setPeek(false); }}>
                    <span className="ri">{i.icon}</span>{t(i.label)}
                  </button>
                ))}
              </div>
              <div className="gt">{t(g.title)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
