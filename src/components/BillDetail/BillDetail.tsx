import { useEffect } from 'react';
import type { Bill } from '../../types/bill';
import { MACEDONIAN_MONTHS, formatMKD } from '../../utils/formatters';
import { getRoommateShare } from '../../utils/calculations';
import StatusBadge from '../StatusBadge/StatusBadge';
import { useHouse } from '../../hooks/useHouse';
import styles from './BillDetail.module.css';

interface Props {
  bill: Bill | null;
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onToggleStatus: (id: string) => void;
}

export default function BillDetail({ bill, onClose, onEdit, onDelete, onToggleStatus }: Props) {
  useEffect(() => {
    if (!bill) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [bill, onClose]);

  const house = useHouse();
  const cats = house.categories;

  if (!bill) return null;

  const monthName = MACEDONIAN_MONTHS[bill.month - 1];

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside className={styles.panel} role="complementary" aria-label={`Детали за ${monthName} ${bill.year}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.monthTitle}>{monthName}</h2>
            <p className={styles.yearSub}>{bill.year}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Затвори">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.totalCard}>
            <div className={styles.totalLabel}>Вкупно</div>
            <div className={styles.totalAmount}>{formatMKD(bill.total)}</div>
          </div>

          <div className={styles.breakdown}>
            <div className={styles.breakdownTitle}>Распределба</div>
            {[
              { name: cats.virtuseElias, value: bill.virtuseElias },
              { name: cats.evn, value: bill.evn },
              { name: cats.vodovod, value: bill.vodovod },
              { name: cats.internetTv, value: bill.internetTv },
              { name: cats.a1, value: bill.a1 },
            ].filter((r) => r.value > 0).map((row) => (
              <div key={row.name} className={styles.breakdownRow}>
                <span className={styles.catName}>{row.name}</span>
                <span className={styles.catValue}>{formatMKD(row.value)}</span>
              </div>
            ))}
          </div>

          {house.roommate && (
            <div className={styles.roommateCard}>
              <div className={styles.roommateHead}>
                <span className={styles.roommateLabel}>Цимер · {house.roommate.name}</span>
                <span className={styles.roommateAmount}>
                  {formatMKD(getRoommateShare(bill.total, house.roommate.rent))}
                </span>
              </div>
              <div className={styles.roommateCalc}>
                Половина од сметките ({formatMKD(Math.round(bill.total / 2))})
                {' + '}кирија ({formatMKD(house.roommate.rent)})
              </div>
            </div>
          )}

          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Статус</span>
            <StatusBadge status={bill.status} onClick={() => onToggleStatus(bill.id)} />
          </div>

          {bill.notes && (
            <div>
              <div className={styles.notesTitle}>Белешки</div>
              <div className={styles.notes}>{bill.notes}</div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.editBtn} onClick={() => onEdit(bill)}>Уреди</button>
          <button className={styles.deleteBtn} onClick={() => onDelete(bill)}>Избриши</button>
        </div>
      </aside>
    </>
  );
}
