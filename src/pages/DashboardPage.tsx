import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useBillsContext } from '../context/BillsContext';
import { useSettings } from '../context/SettingsContext';
import { useHouse } from '../hooks/useHouse';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 640);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}
import {
  getMonthlyTrend, getCategoryTotals, getYearlyTotals,
  getHighestBill, getUnpaidTotal, getAverageMonthly,
} from '../utils/calculations';
import { formatMKD, monthShort, monthLabel, MACEDONIAN_MONTHS } from '../utils/formatters';
import styles from '../components/Dashboard/Dashboard.module.css';

const COLORS = ['#5BB85B', '#E05C5C', '#4A9ECC', '#CC7A4A', '#9C6ECC'];

interface TooltipPayload { name: string; value: number; color: string; }
interface CustomTipProps { active?: boolean; payload?: TooltipPayload[]; label?: string | number; }

function MKDTooltip({ active, payload, label }: CustomTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem', boxShadow: 'var(--shadow)' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem' }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatMKD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { bills } = useBillsContext();
  const { settings } = useSettings();
  const house = useHouse();
  const cats = house.categories;
  const lang = settings.monthsLang;
  const isMobile = useIsMobile();

  const totalAll = bills.reduce((s, b) => s + b.total, 0);
  const currentYear = new Date().getFullYear();
  const yearBills = bills.filter((b) => b.year === currentYear);
  const totalYear = yearBills.reduce((s, b) => s + b.total, 0);
  const unpaidTotal = getUnpaidTotal(bills);
  const avgMonthly = getAverageMonthly(bills);
  const highest = getHighestBill(bills);
  const unpaidBills = bills.filter((b) => b.status === 'unpaid').sort((a, b) => a.year - b.year || a.month - b.month);

  const monthlyTrend = getMonthlyTrend(bills).map((d) => ({
    ...d,
    label: monthShort(d.month, d.year),
  }));

  const catTotals = getCategoryTotals(bills);
  const pieData = [
    { name: cats.virtuseElias, value: catTotals.virtuseElias },
    { name: cats.evn, value: catTotals.evn },
    { name: cats.vodovod, value: catTotals.vodovod },
    { name: cats.internetTv, value: catTotals.internetTv },
    { name: cats.a1, value: catTotals.a1 },
  ].filter((d) => d.value > 0);

  const yearlyData = getYearlyTotals(bills).map((d) => ({ ...d, label: String(d.year) }));

  return (
    <div>
      {unpaidBills.length > 0 && (
        <div className={styles.unpaidAlert}>
          <div className={styles.unpaidHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--status-unpaid)' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className={styles.unpaidTitle}>Неплатени сметки</span>
            <span className={styles.unpaidCount}>{unpaidBills.length}</span>
          </div>
          <div className={styles.unpaidList}>
            {unpaidBills.map((b) => (
              <span key={b.id} className={styles.unpaidChip}>
                {monthLabel(b.month, b.year, lang)} — {formatMKD(b.total)}
              </span>
            ))}
          </div>
          <div>
            <div className={styles.unpaidTotalLabel}>Вкупно неплатено</div>
            <div className={styles.unpaidTotal}>{formatMKD(unpaidTotal)}</div>
          </div>
        </div>
      )}

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Вкупно потрошено</div>
          <div className={`${styles.kpiValue} ${styles.kpiValueGold}`}>{formatMKD(totalAll)}</div>
          <div className={styles.kpiSub}>Сите периоди</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Оваа година ({currentYear})</div>
          <div className={styles.kpiValue}>{formatMKD(totalYear)}</div>
          <div className={styles.kpiSub}>{yearBills.length} месеци</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Неплатено</div>
          <div className={`${styles.kpiValue} ${unpaidTotal > 0 ? styles.kpiValueDanger : styles.kpiValuePaid}`}>
            {formatMKD(unpaidTotal)}
          </div>
          <div className={styles.kpiSub}>{unpaidBills.length} сметки</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Просек / месец</div>
          <div className={styles.kpiValue}>{formatMKD(avgMonthly)}</div>
          <div className={styles.kpiSub}>{bills.length} месеци вкупно</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Месечен тренд — Вкупно</div>
          <ResponsiveContainer width="100%" height={isMobile ? 300 : 260}>
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 10, bottom: isMobile ? 48 : 5 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8A951" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C8A951" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 10 : 11 }}
                tickLine={false}
                axisLine={false}
                interval={isMobile ? 1 : 2}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 60 : 30}
              />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<MKDTooltip />} />
              <Area type="monotone" dataKey="total" name="Вкупно" stroke="#C8A951" fill="url(#gradTotal)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Распределба по категорија</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => typeof value === 'number' ? formatMKD(value) : ''} contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={10} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Споредба по година</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yearlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<MKDTooltip />} />
              <Bar dataKey="total" name="Вкупно" fill="#C8A951" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {highest && (
          <div className={styles.highestCard}>
            <div className={styles.highestLabel}>⭐ Највисока сметка</div>
            <div className={styles.highestMonth}>{MACEDONIAN_MONTHS[highest.month - 1]} {highest.year}</div>
            <div className={styles.highestAmount}>{formatMKD(highest.total)}</div>
            <div className={styles.highestBreakdown}>
              {[
                { name: cats.virtuseElias, value: highest.virtuseElias },
                { name: cats.evn, value: highest.evn },
                { name: cats.vodovod, value: highest.vodovod },
                { name: cats.internetTv, value: highest.internetTv },
                { name: cats.a1, value: highest.a1 },
              ].filter((r) => r.value > 0).map((row) => (
                <div key={row.name} className={styles.highestRow}>
                  <span className={styles.highestRowLabel}>{row.name}</span>
                  <span className={styles.highestRowVal}>{formatMKD(row.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
