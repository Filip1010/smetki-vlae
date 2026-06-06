import { useMemo, useState } from 'react';
import type { Bill, BillFilters, BillSortKey, SortDirection } from '../types/bill';
import { MACEDONIAN_MONTHS } from '../utils/formatters';

const PAGE_SIZE = 15;

export function useFilters(bills: Bill[]) {
  const [filters, setFiltersState] = useState<BillFilters>({ year: 'all', status: 'all', search: '' });
  const [sortKey, setSortKey] = useState<BillSortKey>('month');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...bills];
    if (filters.year !== 'all') result = result.filter((b) => b.year === filters.year);
    if (filters.status !== 'all') result = result.filter((b) => b.status === filters.status);
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((b) => {
        const mn = MACEDONIAN_MONTHS[b.month - 1].toLowerCase();
        return mn.includes(q) || String(b.year).includes(q) || (b.notes ?? '').toLowerCase().includes(q);
      });
    }
    result.sort((a, b) => {
      const av = sortKey === 'month' ? a.year * 100 + a.month : a[sortKey];
      const bv = sortKey === 'month' ? b.year * 100 + b.month : b[sortKey];
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return result;
  }, [bills, filters, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilter = <K extends keyof BillFilters>(key: K, value: BillFilters[K]) => {
    setFiltersState((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const toggleSort = (key: BillSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  return { filters, setFilter, sortKey, sortDir, toggleSort, page, setPage, totalPages, filtered, paginated, PAGE_SIZE };
}
