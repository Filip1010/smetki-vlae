import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bill } from '../types/bill';
import { computeTotal } from '../utils/calculations';
import { useSettings } from '../context/SettingsContext';
import { getHouse } from '../data/houses';
import { GMAIL_UPDATE_EVENT, deduplicateAllBills } from '../lib/billMerger';

const MK_MONTHS = [
  'Јануари','Февруари','Март','Април','Мај','Јуни',
  'Јули','Август','Септември','Октомври','Ноември','Декември',
];

function loadFromKey(key: string): Bill[] {
  try {
    const raw = localStorage.getItem(key);
    const bills = raw ? (JSON.parse(raw) as Bill[]) : [];
    return bills.map((b) => ({ ...b, a1: b.a1 ?? 0 }));
  } catch {
    return [];
  }
}

function saveToKey(key: string, bills: Bill[]) {
  localStorage.setItem(key, JSON.stringify(bills));
}

export function useBills() {
  const { settings } = useSettings();
  const storageKey = getHouse(settings.activeHouseId).storageKey;
  const storageKeyRef = useRef(storageKey);

  const [bills, setBills] = useState<Bill[]>(() => {
    deduplicateAllBills();
    return loadFromKey(storageKey);
  });

  // Reload bills when house changes
  useEffect(() => {
    if (storageKey === storageKeyRef.current) return;
    storageKeyRef.current = storageKey;
    setBills(loadFromKey(storageKey));
  }, [storageKey]);

  // Reload bills when the Gmail fetcher writes new data to localStorage
  useEffect(() => {
    const handler = () => setBills(loadFromKey(storageKeyRef.current));
    window.addEventListener(GMAIL_UPDATE_EVENT, handler);
    return () => window.removeEventListener(GMAIL_UPDATE_EVENT, handler);
  }, []);

  const persist = useCallback((updated: Bill[]) => {
    setBills(updated);
    saveToKey(storageKeyRef.current, updated);
  }, []);

  const addBill = useCallback(
    (data: Omit<Bill, 'id' | 'total' | 'createdAt' | 'updatedAt'>): Bill => {
      const now = new Date().toISOString();
      const bill: Bill = {
        ...data,
        id: crypto.randomUUID(),
        total: computeTotal(data),
        createdAt: now,
        updatedAt: now,
      };
      persist([...bills, bill]);
      return bill;
    },
    [bills, persist],
  );

  const updateBill = useCallback(
    (id: string, data: Partial<Omit<Bill, 'id' | 'createdAt'>>) => {
      persist(
        bills.map((b) => {
          if (b.id !== id) return b;
          const merged = { ...b, ...data, updatedAt: new Date().toISOString() };
          merged.total = computeTotal(merged);
          return merged;
        }),
      );
    },
    [bills, persist],
  );

  const deleteBill = useCallback(
    (id: string) => persist(bills.filter((b) => b.id !== id)),
    [bills, persist],
  );

  const toggleStatus = useCallback(
    (id: string) => {
      const bill = bills.find((b) => b.id === id);
      if (bill) updateBill(id, { status: bill.status === 'paid' ? 'unpaid' : 'paid' });
    },
    [bills, updateBill],
  );

  const replaceBills = useCallback((incoming: Bill[]) => persist(incoming), [persist]);

  const exportCSV = useCallback((fromYear: number, fromMonth: number, toYear: number, toMonth: number) => {
    const house = getHouse(settings.activeHouseId);
    const cats = house.categories;

    const inRange = bills.filter((b) => {
      const v = b.year * 100 + b.month;
      return v >= fromYear * 100 + fromMonth && v <= toYear * 100 + toMonth;
    });
    const sorted = [...inRange].sort((a, b) => a.year - b.year || a.month - b.month);

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;
    const periodFrom = `${MK_MONTHS[fromMonth - 1]} ${fromYear}`;
    const periodTo   = `${MK_MONTHS[toMonth   - 1]} ${toYear}`;

    const colCount = house.hasA1 ? 9 : 8;
    const emptyCols = ','.repeat(colCount - 1);

    const catCols = house.hasA1
      ? [`${cats.virtuseElias} (ден.)`, `${cats.evn} (ден.)`, `${cats.vodovod} (ден.)`, `${cats.internetTv} (ден.)`, `${cats.a1} (ден.)`]
      : [`${cats.virtuseElias} (ден.)`, `${cats.evn} (ден.)`, `${cats.vodovod} (ден.)`, `${cats.internetTv} (ден.)`];

    const headers = ['Месец', 'Година', ...catCols, 'Вкупно (ден.)', 'Статус', 'Забелешки'];

    const dataRows = sorted.map((b) => {
      const cats_ = house.hasA1
        ? [b.virtuseElias, b.evn, b.vodovod, b.internetTv, b.a1]
        : [b.virtuseElias, b.evn, b.vodovod, b.internetTv];
      return [
        MK_MONTHS[b.month - 1],
        b.year,
        ...cats_,
        b.total,
        b.status === 'paid' ? 'Платено' : 'Неплатено',
        b.notes ? `"${b.notes.replace(/"/g, '""')}"` : '',
      ].join(',');
    });

    const vSum  = sorted.reduce((s, b) => s + b.virtuseElias, 0);
    const eSum  = sorted.reduce((s, b) => s + b.evn, 0);
    const wSum  = sorted.reduce((s, b) => s + b.vodovod, 0);
    const iSum  = sorted.reduce((s, b) => s + b.internetTv, 0);
    const a1Sum = sorted.reduce((s, b) => s + b.a1, 0);
    const tSum  = sorted.reduce((s, b) => s + b.total, 0);
    const paidCount   = sorted.filter((b) => b.status === 'paid').length;
    const unpaidCount = sorted.filter((b) => b.status === 'unpaid').length;
    const n = sorted.length || 1;

    const sumCols = house.hasA1
      ? `${vSum},${eSum},${wSum},${iSum},${a1Sum}`
      : `${vSum},${eSum},${wSum},${iSum}`;
    const avgCols = house.hasA1
      ? `${Math.round(vSum/n)},${Math.round(eSum/n)},${Math.round(wSum/n)},${Math.round(iSum/n)},${Math.round(a1Sum/n)}`
      : `${Math.round(vSum/n)},${Math.round(eSum/n)},${Math.round(wSum/n)},${Math.round(iSum/n)}`;

    const BOM = '﻿';
    const lines = [
      `${house.label} — Извештај за комунални сметки${emptyCols}`,
      `Период:,${periodFrom} — ${periodTo}${','.repeat(colCount - 2)}`,
      `Датум на извоз:,${dateStr}${','.repeat(colCount - 2)}`,
      emptyCols,
      headers.join(','),
      ...dataRows,
      emptyCols,
      `ВКУПНО,,${sumCols},${tSum},${paidCount} платено / ${unpaidCount} неплатено,`,
      `Просек / месец,,${avgCols},${Math.round(tSum/n)},,`,
    ];

    const csv = BOM + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${house.label.replace(/\s+/g, '-')}-${periodFrom.replace(/ /g,'-')}-${periodTo.replace(/ /g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bills, settings.activeHouseId]);

  return { bills, addBill, updateBill, deleteBill, toggleStatus, replaceBills, exportCSV };
}
