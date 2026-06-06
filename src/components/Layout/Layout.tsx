import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useGoogleSheets } from '../../context/GoogleSheetsContext';
import { useSettings } from '../../context/SettingsContext';
import { HOUSES, getHouse } from '../../data/houses';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Контролна табла',
    icon: (
      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/bills',
    label: 'Сметки',
    icon: (
      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Аналитика',
    icon: (
      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Поставки',
    icon: (
      <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Контролна табла',
  '/bills': 'Сметки',
  '/analytics': 'Аналитика',
  '/settings': 'Поставки',
};

interface Props { children: React.ReactNode; }

export default function Layout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [houseDropOpen, setHouseDropOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { isConfigured, isConnected, syncStatus } = useGoogleSheets();
  const { settings, setActiveHouseId } = useSettings();

  const activeHouse = getHouse(settings.activeHouseId);
  const title = PAGE_TITLES[location.pathname] ?? activeHouse.label;

  useEffect(() => {
    if (!houseDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setHouseDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [houseDropOpen]);

  const sidebarClass = [
    styles.sidebar,
    collapsed ? styles.sidebarCollapsed : '',
    mobileOpen ? styles.sidebarOpen : '',
  ].filter(Boolean).join(' ');

  const mainClass = [styles.main, collapsed ? styles.mainCollapsed : ''].filter(Boolean).join(' ');

  return (
    <div className={styles.shell}>
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={sidebarClass} aria-label="Главна навигација">
        <div
          ref={brandRef}
          className={`${styles.brand} ${styles.brandClickable}`}
          onClick={() => setHouseDropOpen((o) => !o)}
          role="button"
          aria-haspopup="listbox"
          aria-expanded={houseDropOpen}
          title="Смени имот"
        >
          <div className={styles.brandIcon}>
            {activeHouse.id === 'vlae' ? 'В' : 'Р'}
          </div>
          <div className={styles.brandText}>
            <div className={styles.brandTitle}>{activeHouse.label}</div>
            <div className={styles.brandSub}>Кузманоски Филип</div>
          </div>
          <svg
            className={`${styles.dropChevron} ${houseDropOpen ? styles.dropChevronOpen : ''}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>

          {houseDropOpen && (
            <div className={styles.houseDropdown} role="listbox">
              {HOUSES.map((h) => (
                <button
                  key={h.id}
                  role="option"
                  aria-selected={h.id === settings.activeHouseId}
                  className={`${styles.houseOption} ${h.id === settings.activeHouseId ? styles.houseOptionActive : ''}`}
                  onClick={(e) => { e.stopPropagation(); setActiveHouseId(h.id); setHouseDropOpen(false); }}
                >
                  <span className={styles.houseCheck}>{h.id === settings.activeHouseId ? '✓' : ''}</span>
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.collapseBtn} onClick={() => setCollapsed((c) => !c)} aria-label="Превиткај страничен панел">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
            </svg>
            <span>{collapsed ? '' : 'Склопи'}</span>
          </button>
        </div>
      </aside>

      <div className={mainClass}>
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={() => setMobileOpen((o) => !o)} aria-label="Отвори мени">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className={styles.pageTitle}>{title}</h1>
          {isConfigured && (
            <div className={styles.syncBadge} title={isConnected ? (syncStatus === 'syncing' ? 'Синхронизира…' : 'Поврзано со Google Sheets') : 'Одврзано'}>
              <span className={`${styles.syncDot} ${isConnected ? (syncStatus === 'syncing' ? styles.syncDotSyncing : styles.syncDotOn) : styles.syncDotOff}`} />
              <span className={styles.syncLabel}>{isConnected ? (syncStatus === 'syncing' ? 'Синхронизира…' : 'Sheets') : 'Одврзано'}</span>
            </div>
          )}
        </header>
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
