import { useState } from 'react';
import type { Bill, BillSortKey } from '../../types/bill';
import { MACEDONIAN_MONTHS, formatMKD, availableYears } from '../../utils/formatters';
import StatusBadge from '../StatusBadge/StatusBadge';
import BillForm from '../BillForm/BillForm';
import BillDetail from '../BillDetail/BillDetail';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import { useFilters } from '../../hooks/useFilters';
import { useHouse } from '../../hooks/useHouse';
import styles from './BillTable.module.css';

interface Props {
  bills: Bill[];
  onAdd: (data: Omit<Bill, 'id' | 'total' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Bill, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export default function BillTable({ bills, onAdd, onUpdate, onDelete, onToggleStatus }: Props) {
  const house = useHouse();
  const cats = house.categories;
  const COLUMNS: { key: BillSortKey; label: string; hideMobile?: boolean }[] = [
    { key: 'month', label: 'Месец / Год.' },
    { key: 'virtuseElias', label: cats.virtuseElias, hideMobile: true },
    { key: 'evn', label: cats.evn, hideMobile: true },
    { key: 'vodovod', label: cats.vodovod, hideMobile: true },
    { key: 'internetTv', label: cats.internetTv, hideMobile: true },
    ...(house.hasA1 ? [{ key: 'a1' as BillSortKey, label: cats.a1, hideMobile: true }] : []),
    { key: 'total', label: 'Вкупно' },
  ];
  const { filters, setFilter, sortKey, sortDir, toggleSort, page, setPage, totalPages, filtered, paginated } = useFilters(bills);
  const [formOpen, setFormOpen] = useState(false);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);

  const years = availableYears(bills);

  const openAdd = () => { setEditBill(null); setFormOpen(true); };
  const openEdit = (b: Bill) => { setDetailBill(null); setEditBill(b); setFormOpen(true); };
  const confirmDelete = (b: Bill) => { setDetailBill(null); setDeleteTarget(b); };

  const handleDelete = () => {
    if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); }
  };

  const sortIndicator = (key: BillSortKey) => {
    if (sortKey !== key) return <span className={styles.sortIcon}>↕</span>;
    return <span className={`${styles.sortIcon} ${styles.sortIconActive}`}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const startRow = (page - 1) * 15 + 1;
  const endRow = Math.min(page * 15, filtered.length);

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarFilters}>
          <select
            className={styles.filterSelect}
            value={String(filters.year)}
            onChange={(e) => setFilter('year', e.target.value === 'all' ? 'all' : Number(e.target.value))}
            aria-label="Филтер по година"
          >
            <option value="all">Сите години</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            className={styles.filterSelect}
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value as typeof filters.status)}
            aria-label="Филтер по статус"
          >
            <option value="all">Сите статуси</option>
            <option value="paid">Платено</option>
            <option value="unpaid">Неплатено</option>
          </select>
        </div>

        <div className={styles.toolbarSearch}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Пребарај..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              aria-label="Пребарај сметки"
            />
          </div>

          <button className={styles.addBtn} onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Додај сметка
          </button>
        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th className={styles.sortable} onClick={() => toggleSort('month')}>
                {COLUMNS[0].label}{sortIndicator('month')}
              </th>
              {COLUMNS.slice(1).map((col) => (
                <th
                  key={col.key}
                  className={`${styles.sortable}${col.hideMobile ? ` ${styles.hideMobile}` : ''}`}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}{sortIndicator(col.key)}
                </th>
              ))}
              <th>Статус</th>
              <th>Акции</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={house.hasA1 ? 9 : 8}>
                  <div className={styles.empty}>
                    <div className={styles.emptyIcon}>📋</div>
                    <div className={styles.emptyTitle}>Нема сметки</div>
                    <div>Нема резултати за избраните филтри</div>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((bill) => (
                <tr
                  key={bill.id}
                  className={bill.status === 'unpaid' ? styles.unpaidRow : ''}
                  onClick={() => setDetailBill(bill)}
                >
                  <td className={styles.monthCell}>{MACEDONIAN_MONTHS[bill.month - 1]} {bill.year}</td>
                  <td className={`${styles.amountCell} ${styles.hideMobile}`}>{formatMKD(bill.virtuseElias)}</td>
                  <td className={`${styles.amountCell} ${styles.hideMobile}`}>{formatMKD(bill.evn)}</td>
                  <td className={`${styles.amountCell} ${styles.hideMobile}`}>{formatMKD(bill.vodovod)}</td>
                  <td className={`${styles.amountCell} ${styles.hideMobile}`}>{formatMKD(bill.internetTv)}</td>
                  {house.hasA1 && <td className={`${styles.amountCell} ${styles.hideMobile}`}>{formatMKD(bill.a1)}</td>}
                  <td className={styles.totalCell}>{formatMKD(bill.total)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusBadge status={bill.status} onClick={() => onToggleStatus(bill.id)} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actionsCell}>
                      <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={() => openEdit(bill)} aria-label="Уреди">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className={`${styles.iconBtn} ${styles.iconBtnDelete}`} onClick={() => confirmDelete(bill)} aria-label="Избриши">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtered.length > 0 && <div className={styles.pagination}>
          <span className={styles.pageInfo}>{startRow}–{endRow} од {filtered.length} сметки</span>
          <div className={styles.pageControls}>
            <button className={styles.pageBtn} onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className={styles.pageBtn} onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
            <button className={styles.pageBtn} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        </div>}
      </div>

      {/* ── Mobile card list ── */}
      <div className={styles.cardList}>
        {paginated.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📋</div>
            <div className={styles.emptyTitle}>Нема сметки</div>
            <div>Нема резултати за избраните филтри</div>
          </div>
        ) : (
          paginated.map((bill) => {
            const catRows = [
              { label: cats.virtuseElias, value: bill.virtuseElias },
              { label: cats.evn, value: bill.evn },
              { label: cats.vodovod, value: bill.vodovod },
              { label: cats.internetTv, value: bill.internetTv },
              ...(house.hasA1 ? [{ label: cats.a1, value: bill.a1 }] : []),
            ].filter((r) => r.value > 0);
            return (
              <div
                key={bill.id}
                className={`${styles.billCard} ${bill.status === 'unpaid' ? styles.billCardUnpaid : ''}`}
                onClick={() => setDetailBill(bill)}
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardMonth}>{MACEDONIAN_MONTHS[bill.month - 1]} {bill.year}</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <StatusBadge status={bill.status} onClick={() => onToggleStatus(bill.id)} />
                  </span>
                </div>
                <div className={styles.cardTotal}>{formatMKD(bill.total)}</div>
                <div className={styles.cardCats}>
                  {catRows.map((r) => (
                    <div key={r.label} className={styles.cardCat}>
                      <span className={styles.cardCatLabel}>{r.label}</span>
                      <span className={styles.cardCatVal}>{formatMKD(r.value)}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={() => openEdit(bill)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Уреди
                  </button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDelete}`} onClick={() => confirmDelete(bill)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                    Избриши
                  </button>
                </div>
              </div>
            );
          })
        )}
        {filtered.length > 0 && <div className={styles.pagination}>
          <span className={styles.pageInfo}>{startRow}–{endRow} од {filtered.length} сметки</span>
          <div className={styles.pageControls}>
            <button className={styles.pageBtn} onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className={styles.pageBtn} onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
            <button className={styles.pageBtn} onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        </div>}
      </div>

      <BillForm
        isOpen={formOpen}
        editBill={editBill}
        existingBills={bills}
        onSave={onAdd}
        onUpdate={onUpdate}
        onClose={() => setFormOpen(false)}
      />

      <BillDetail
        bill={detailBill}
        onClose={() => setDetailBill(null)}
        onEdit={openEdit}
        onDelete={confirmDelete}
        onToggleStatus={onToggleStatus}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Избриши сметка"
        message={
          deleteTarget
            ? `Дали сте сигурни дека сакате да ја избришете сметката за ${MACEDONIAN_MONTHS[deleteTarget.month - 1]} ${deleteTarget.year} (${formatMKD(deleteTarget.total)})?`
            : ''
        }
        confirmLabel="Избриши"
        cancelLabel="Откажи"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
