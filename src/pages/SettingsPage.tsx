import { useState, useMemo } from 'react';
import { useBillsContext } from '../context/BillsContext';
import { useSettings } from '../context/SettingsContext';
import { useGoogleSheets } from '../context/GoogleSheetsContext';
import { useHouse } from '../hooks/useHouse';

const MK_MONTHS = [
  'Јануари','Февруари','Март','Април','Мај','Јуни',
  'Јули','Август','Септември','Октомври','Ноември','Декември',
];

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '1rem 0', borderBottom: '1px solid var(--border)',
};
const label: React.CSSProperties = { fontSize: '0.9rem', fontWeight: 500 };
const sublabel: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' };
const section: React.CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem',
  boxShadow: 'var(--shadow)', marginBottom: '1.25rem',
};
const sectionTitle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem',
};
const toggleGroup: React.CSSProperties = { display: 'flex', gap: '0.5rem' };

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.375rem 1rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.8rem', fontWeight: 600,
        background: active ? 'var(--accent-gold)' : 'transparent',
        color: active ? '#0D1B3E' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent-gold)' : 'var(--border)'}`,
        transition: 'all var(--transition)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const { bills, exportCSV } = useBillsContext();
  const { settings, setTheme, setMonthsLang } = useSettings();
  const { isConfigured, isConnected, syncStatus, lastSynced, syncError, connect, disconnect, syncNow } = useGoogleSheets();
  const activeHouse = useHouse();

  const [showExport, setShowExport] = useState(false);

  const billRange = useMemo(() => {
    if (!bills.length) return null;
    const sorted = [...bills].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));
    return { first: sorted[0], last: sorted[sorted.length - 1] };
  }, [bills]);

  const [expFrom, setExpFrom] = useState({ year: new Date().getFullYear(), month: 1 });
  const [expTo, setExpTo] = useState({ year: new Date().getFullYear(), month: 12 });

  const availableYears = useMemo(() => {
    const ys = [...new Set(bills.map((b) => b.year))].sort();
    return ys.length ? ys : [new Date().getFullYear()];
  }, [bills]);

  const openExport = () => {
    if (billRange) {
      setExpFrom({ year: billRange.first.year, month: billRange.first.month });
      setExpTo({ year: billRange.last.year, month: billRange.last.month });
    }
    setShowExport(true);
  };

  const doExport = () => {
    exportCSV(expFrom.year, expFrom.month, expTo.year, expTo.month);
    setShowExport(false);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={section}>
        <div style={sectionTitle}>Информации за апликацијата</div>
        <div style={{ ...row, borderTop: '1px solid var(--border)' }}>
          <div><div style={label}>Сопственик</div><div style={sublabel}>Сметки / станот</div></div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>Кузманоски Филип</span>
        </div>
        <div style={row}>
          <div><div style={label}>Имот</div><div style={sublabel}>Адреса / назив</div></div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{activeHouse.label}</span>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <div><div style={label}>Валута</div><div style={sublabel}>Приказ на износи</div></div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>МКД (ден.)</span>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Изглед</div>
        <div style={{ ...row, borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={label}>Тема</div>
            <div style={sublabel}>Темна / светла тема</div>
          </div>
          <div style={toggleGroup}>
            <ToggleBtn active={settings.theme === 'dark'} onClick={() => setTheme('dark')}>Темна</ToggleBtn>
            <ToggleBtn active={settings.theme === 'light'} onClick={() => setTheme('light')}>Светла</ToggleBtn>
          </div>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <div>
            <div style={label}>Јазик на месеци</div>
            <div style={sublabel}>Македонски / Англиски</div>
          </div>
          <div style={toggleGroup}>
            <ToggleBtn active={settings.monthsLang === 'mk'} onClick={() => setMonthsLang('mk')}>Македонски</ToggleBtn>
            <ToggleBtn active={settings.monthsLang === 'en'} onClick={() => setMonthsLang('en')}>English</ToggleBtn>
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Google Sheets Синхронизација</div>
        {!isConfigured ? (
          <div style={{ ...row, borderTop: '1px solid var(--border)', borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={label}>Не е конфигурирано</div>
            <div style={{ ...sublabel, lineHeight: 1.6 }}>
              Додадете <code style={{ background: 'var(--bg-tertiary)', padding: '0 4px', borderRadius: 3 }}>VITE_GOOGLE_CLIENT_ID=...</code> во <code style={{ background: 'var(--bg-tertiary)', padding: '0 4px', borderRadius: 3 }}>.env</code> датотеката за да ја активирате синхронизацијата со Google Sheets.
            </div>
          </div>
        ) : (
          <>
            <div style={{ ...row, borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={label}>Статус</div>
                <div style={sublabel}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#5BB85B' : '#888', marginRight: 6 }} />
                  {isConnected ? 'Поврзано' : 'Одврзано'}
                  {lastSynced && <span style={{ marginLeft: 8 }}>· последна синхронизација: {lastSynced.toLocaleTimeString()}</span>}
                </div>
                {syncError && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>{syncError}</div>}
              </div>
              {isConnected ? (
                <button
                  onClick={disconnect}
                  style={{ padding: '0.375rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Одврзи
                </button>
              ) : (
                <button
                  onClick={connect}
                  style={{ padding: '0.375rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, background: 'var(--accent-gold)', color: '#0D1B3E', border: 'none', cursor: 'pointer' }}
                >
                  Поврзи со Google
                </button>
              )}
            </div>
            {isConnected && (
              <div style={{ ...row, borderBottom: 'none' }}>
                <div>
                  <div style={label}>Рачна синхронизација</div>
                  <div style={sublabel}>Повлечи ги промените од Sheets и испрати ги локалните промени</div>
                </div>
                <button
                  onClick={() => void syncNow()}
                  disabled={syncStatus === 'syncing'}
                  style={{ padding: '0.375rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, background: 'transparent', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer', opacity: syncStatus === 'syncing' ? 0.6 : 1 }}
                >
                  {syncStatus === 'syncing' ? 'Синхронизира…' : 'Синхронизирај'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={section}>
        <div style={sectionTitle}>Податоци</div>
        <div style={{ ...row, borderTop: '1px solid var(--border)', borderBottom: showExport ? '1px solid var(--border)' : 'none' }}>
          <div>
            <div style={label}>Извоз на CSV</div>
            <div style={sublabel}>Одберете период и преземете ги сметките</div>
          </div>
          <button
            onClick={openExport}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem', fontWeight: 600,
              background: 'var(--accent-gold)', color: '#0D1B3E',
              border: 'none', cursor: 'pointer', transition: 'all var(--transition)',
            }}
          >
            Извези CSV
          </button>
        </div>

        {showExport && (
          <div style={{ padding: '1rem 0 0.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ ...sublabel, marginBottom: '0.375rem', fontWeight: 600 }}>Од</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={expFrom.month}
                    onChange={(e) => setExpFrom((f) => ({ ...f, month: Number(e.target.value) }))}
                    style={{ flex: 1, padding: '0.375rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    {MK_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                  <select
                    value={expFrom.year}
                    onChange={(e) => setExpFrom((f) => ({ ...f, year: Number(e.target.value) }))}
                    style={{ width: 76, padding: '0.375rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ ...sublabel, marginBottom: '0.375rem', fontWeight: 600 }}>До</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={expTo.month}
                    onChange={(e) => setExpTo((f) => ({ ...f, month: Number(e.target.value) }))}
                    style={{ flex: 1, padding: '0.375rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    {MK_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                  <select
                    value={expTo.year}
                    onChange={(e) => setExpTo((f) => ({ ...f, year: Number(e.target.value) }))}
                    style={{ width: 76, padding: '0.375rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExport(false)}
                style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                Откажи
              </button>
              <button
                onClick={doExport}
                style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, background: 'var(--accent-gold)', color: '#0D1B3E', border: 'none', cursor: 'pointer' }}
              >
                Преземи CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
