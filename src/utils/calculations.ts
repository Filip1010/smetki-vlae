import type { Bill } from '../types/bill';

export const computeTotal = (
  bill: Pick<Bill, 'virtuseElias' | 'evn' | 'vodovod' | 'internetTv' | 'a1'>,
): number => bill.virtuseElias + bill.evn + bill.vodovod + bill.internetTv + bill.a1;

export const getYearlyTotals = (bills: Bill[]): { year: number; total: number }[] => {
  const map = new Map<number, number>();
  for (const bill of bills) {
    map.set(bill.year, (map.get(bill.year) ?? 0) + bill.total);
  }
  return [...map.entries()].map(([year, total]) => ({ year, total })).sort((a, b) => a.year - b.year);
};

export const getCategoryTotals = (bills: Bill[]) => ({
  virtuseElias: bills.reduce((s, b) => s + b.virtuseElias, 0),
  evn: bills.reduce((s, b) => s + b.evn, 0),
  vodovod: bills.reduce((s, b) => s + b.vodovod, 0),
  internetTv: bills.reduce((s, b) => s + b.internetTv, 0),
  a1: bills.reduce((s, b) => s + b.a1, 0),
});

export const getMonthlyTrend = (bills: Bill[]) =>
  [...bills]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((b) => ({
      month: b.month,
      year: b.year,
      total: b.total,
      virtuseElias: b.virtuseElias,
      evn: b.evn,
      vodovod: b.vodovod,
      internetTv: b.internetTv,
      a1: b.a1,
    }));

export const getUnpaidTotal = (bills: Bill[]): number =>
  bills.filter((b) => b.status === 'unpaid').reduce((s, b) => s + b.total, 0);

export const getAverageMonthly = (bills: Bill[]): number =>
  bills.length === 0 ? 0 : Math.round(bills.reduce((s, b) => s + b.total, 0) / bills.length);

export const getHighestBill = (bills: Bill[]): Bill | null =>
  bills.reduce<Bill | null>((max, b) => (!max || b.total > max.total ? b : max), null);

export const getRunningTotal = (bills: Bill[]) => {
  const sorted = [...bills].sort((a, b) => a.year - b.year || a.month - b.month);
  let running = 0;
  return sorted.map((b) => {
    running += b.total;
    return { month: b.month, year: b.year, total: b.total, running };
  });
};

export const getTopExpensiveMonths = (bills: Bill[], n = 10): Bill[] =>
  [...bills].sort((a, b) => b.total - a.total).slice(0, n);

export const getCategoryShareByYear = (bills: Bill[]) => {
  const years = [...new Set(bills.map((b) => b.year))].sort();
  return years.map((year) => {
    const yb = bills.filter((b) => b.year === year);
    const total = yb.reduce((s, b) => s + b.total, 0);
    const cats = getCategoryTotals(yb);
    return {
      year,
      total,
      virtuseEliasP: total ? Math.round((cats.virtuseElias / total) * 100) : 0,
      evnP: total ? Math.round((cats.evn / total) * 100) : 0,
      vodovodP: total ? Math.round((cats.vodovod / total) * 100) : 0,
      internetTvP: total ? Math.round((cats.internetTv / total) * 100) : 0,
      a1P: total ? Math.round((cats.a1 / total) * 100) : 0,
      virtuseElias: cats.virtuseElias,
      evn: cats.evn,
      vodovod: cats.vodovod,
      internetTv: cats.internetTv,
      a1: cats.a1,
    };
  });
};

export const getMonthlyComparison = (bills: Bill[]) => {
  const months = [...new Set(bills.map((b) => b.month))].sort((a, b) => a - b);
  const years = [...new Set(bills.map((b) => b.year))].sort((a, b) => a - b);
  return months.map((month) => {
    const row: Record<string, number | string> = { month };
    for (const year of years) {
      const bill = bills.find((b) => b.month === month && b.year === year);
      row[String(year)] = bill ? bill.total : 0;
    }
    return row;
  });
};
