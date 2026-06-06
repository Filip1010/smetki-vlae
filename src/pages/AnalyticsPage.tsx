import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useBillsContext } from '../context/BillsContext';
import { useSettings } from '../context/SettingsContext';
import { useHouse } from '../hooks/useHouse';
import styles from './AnalyticsPage.module.css';
import {
  getMonthlyTrend, getRunningTotal, getTopExpensiveMonths,
  getCategoryShareByYear, getMonthlyComparison,
} from '../utils/calculations';
import { formatMKD, monthShort, monthLabel, availableYears, MACEDONIAN_MONTHS } from '../utils/formatters';

const CAT_COLORS = {
  virtuseElias: '#5BB85B',
  evn: '#E05C5C',
  vodovod: '#4A9ECC',
  internetTv: '#CC7A4A',
  a1: '#9C6ECC',
};

const CHART_STYLE = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow)',
};

interface TooltipPayload { name: string; value: number; color: string; }
interface CustomTipProps { active?: boolean; payload?: TooltipPayload[]; label?: string | number; }

function MKDTooltip({ active, payload, label }: CustomTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.875rem', boxShadow: 'var(--shadow)', maxWidth: 200 }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginBottom: '0.375rem' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.75rem' }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatMKD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 640);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

/* Compact legend shown below charts on mobile instead of Recharts Legend */
function MobileLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className={styles.mobileLegend}>
      {items.map((item) => (
        <span key={item.name} className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

/* Short currency: 3456 → "3.5k", 456 → "456" */
function shortMKD(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return String(val);
}

export default function AnalyticsPage() {
  const { bills } = useBillsContext();
  const { settings } = useSettings();
  const house = useHouse();
  const cats = house.categories;
  const lang = settings.monthsLang;
  const isMobile = useIsMobile();

  const trend = getMonthlyTrend(bills).map((d) => ({ ...d, label: monthShort(d.month, d.year) }));
  const running = getRunningTotal(bills).map((d) => ({ ...d, label: monthShort(d.month, d.year) }));
  const top10 = getTopExpensiveMonths(bills, 10);
  const shareByYear = getCategoryShareByYear(bills);
  const years = availableYears(bills);
  const comparison = getMonthlyComparison(bills);

  const barColors = ['#C8A951', '#4A9ECC', '#5BB85B', '#CC7A4A', '#9C6ECC', '#CC4A4A'];

  const catLines = [
    { key: 'virtuseElias', name: cats.virtuseElias, color: CAT_COLORS.virtuseElias },
    { key: 'evn', name: cats.evn, color: CAT_COLORS.evn },
    { key: 'vodovod', name: cats.vodovod, color: CAT_COLORS.vodovod },
    { key: 'internetTv', name: cats.internetTv, color: CAT_COLORS.internetTv },
    ...(house.hasA1 ? [{ key: 'a1', name: cats.a1, color: CAT_COLORS.a1 }] : []),
  ];

  const h = {
    trend: isMobile ? 200 : 300,
    top10: isMobile ? 260 : 320,
    small: isMobile ? 180 : 220,
    annual: isMobile ? 160 : 200,
  };

  const yAxisW = isMobile ? 34 : 42;

  return (
    <div>
      {/* ── Тренд по категорија ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Тренд по категорија</div>
        {isMobile && <MobileLegend items={catLines} />}
        <ResponsiveContainer width="100%" height={h.trend}>
          <LineChart data={trend} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 10 : 11 }}
              tickLine={false} axisLine={false}
              interval={isMobile ? 5 : 2}
            />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              width={yAxisW}
            />
            <Tooltip content={<MKDTooltip />} />
            {!isMobile && (
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{v}</span>}
              />
            )}
            {catLines.map((c) => (
              <Line key={c.key} type="monotone" dataKey={c.key} name={c.name}
                stroke={c.color} strokeWidth={isMobile ? 1.5 : 2} dot={false} activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Топ 10 ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Топ 10 — Најскапи месеци</div>
        <ResponsiveContainer width="100%" height={h.top10}>
          <BarChart
            data={top10.map((b) => ({
              label: isMobile ? monthShort(b.month, b.year) : monthLabel(b.month, b.year, lang),
              total: b.total,
            }))}
            layout="vertical"
            margin={isMobile
              ? { top: 4, right: 16, left: 58, bottom: 4 }
              : { top: 5, right: 30, left: 80, bottom: 5 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 10 : 11 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category" dataKey="label"
              tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 9 : 11 }}
              tickLine={false} axisLine={false}
              width={isMobile ? 58 : 80}
            />
            <Tooltip content={<MKDTooltip />} />
            <Bar dataKey="total" name="Вкупно" radius={[0, 4, 4, 0]}>
              {top10.map((_e, i) => (
                <Cell key={`c-${i}`} fill={i === 0 ? '#C8A951' : '#4A9ECC'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Кумулативно + Удел ── */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Кумулативно потрошено</div>
          <ResponsiveContainer width="100%" height={h.small}>
            <AreaChart data={running} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradRunning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A9ECC" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4A9ECC" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                tickLine={false} axisLine={false}
                interval={isMobile ? 8 : 3}
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                tickLine={false} axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                width={yAxisW}
              />
              <Tooltip content={<MKDTooltip />} />
              <Area type="monotone" dataKey="running" name="Кумулативно"
                stroke="#4A9ECC" fill="url(#gradRunning)" strokeWidth={2} dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Удел по категорија (%)</div>
          {isMobile && <MobileLegend items={catLines} />}
          <ResponsiveContainer width="100%" height={h.small}>
            <BarChart data={shareByYear} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                tickLine={false} axisLine={false}
                tickFormatter={(v: number) => `${v}%`}
                width={yAxisW}
              />
              <Tooltip
                contentStyle={CHART_STYLE}
                formatter={(value, name) => [`${typeof value === 'number' ? value : Number(value ?? 0)}%`, name as string]}
                labelStyle={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}
              />
              {!isMobile && (
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{v}</span>}
                />
              )}
              <Bar dataKey="virtuseEliasP" name={cats.virtuseElias} stackId="a" fill={CAT_COLORS.virtuseElias} />
              <Bar dataKey="evnP" name={cats.evn} stackId="a" fill={CAT_COLORS.evn} />
              <Bar dataKey="vodovodP" name={cats.vodovod} stackId="a" fill={CAT_COLORS.vodovod} />
              <Bar dataKey="internetTvP" name={cats.internetTv} stackId="a" fill={CAT_COLORS.internetTv}
                radius={house.hasA1 ? undefined : [4, 4, 0, 0]} />
              {house.hasA1 && (
                <Bar dataKey="a1P" name={cats.a1} stackId="a" fill={CAT_COLORS.a1} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Споредба по месец ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Споредба — ист месец низ годините</div>
        <div className={styles.compWrap}>
          <table className={styles.compTable}>
            <thead>
              <tr>
                <th>Месец</th>
                {years.map((y) => <th key={y}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => {
                const month = Number(row.month);
                const values = years.map((y) => Number(row[String(y)] ?? 0));
                const maxVal = Math.max(...values);
                return (
                  <tr key={month} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td>{isMobile ? MACEDONIAN_MONTHS[month - 1].slice(0, 3) : MACEDONIAN_MONTHS[month - 1]}</td>
                    {years.map((y) => {
                      const val = Number(row[String(y)] ?? 0);
                      return (
                        <td key={y} style={{
                          fontWeight: val === maxVal && val > 0 ? 700 : 400,
                          color: val === maxVal && val > 0
                            ? 'var(--accent-gold)'
                            : val === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                        }}>
                          {val > 0 ? (isMobile ? shortMKD(val) : formatMKD(val)) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Годишни вкупни ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Годишни вкупни износи</div>
        <ResponsiveContainer width="100%" height={h.annual}>
          <BarChart
            data={years.map((y, i) => {
              const yBills = bills.filter((b) => b.year === y);
              return {
                year: String(y),
                total: yBills.reduce((s, b) => s + b.total, 0),
                color: barColors[i % barColors.length],
              };
            })}
            margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              width={yAxisW}
            />
            <Tooltip content={<MKDTooltip />} />
            <Bar dataKey="total" name="Вкупно" radius={[4, 4, 0, 0]}>
              {years.map((_, i) => (
                <Cell key={`c-${i}`} fill={barColors[i % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
