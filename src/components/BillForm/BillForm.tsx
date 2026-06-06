import { useEffect, useRef, useState } from 'react';
import type { Bill, PaymentStatus } from '../../types/bill';
import { MACEDONIAN_MONTHS } from '../../utils/formatters';
import { computeTotal } from '../../utils/calculations';
import { formatMKD } from '../../utils/formatters';
import { useHouse } from '../../hooks/useHouse';
import styles from './BillForm.module.css';

interface Props {
  isOpen: boolean;
  editBill?: Bill | null;
  existingBills: Bill[];
  onSave: (data: Omit<Bill, 'id' | 'total' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Bill, 'id' | 'createdAt'>>) => void;
  onClose: () => void;
}

const defaultForm = {
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  virtuseElias: 0,
  evn: 0,
  vodovod: 0,
  internetTv: 0,
  a1: 0,
  status: 'unpaid' as PaymentStatus,
  notes: '',
};

export default function BillForm({ isOpen, editBill, existingBills, onSave, onUpdate, onClose }: Props) {
  const house = useHouse();
  const cats = house.categories;
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editBill) {
      setForm({
        month: editBill.month,
        year: editBill.year,
        virtuseElias: editBill.virtuseElias,
        evn: editBill.evn,
        vodovod: editBill.vodovod,
        internetTv: editBill.internetTv,
        a1: editBill.a1,
        status: editBill.status,
        notes: editBill.notes ?? '',
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
    setTimeout(() => firstRef.current?.focus(), 50);
  }, [isOpen, editBill]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const set = (key: keyof typeof form, value: string | number | PaymentStatus) =>
    setForm((f) => ({ ...f, [key]: value }));

  const numField = (key: 'virtuseElias' | 'evn' | 'vodovod' | 'internetTv' | 'a1', val: string) => {
    const n = Math.max(0, Number(val) || 0);
    set(key, n);
  };

  const total = computeTotal(form);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.year < 2000 || form.year > 2100) errs.year = 'Внесете валидна година';
    const dup = existingBills.find(
      (b) => b.month === form.month && b.year === form.year && b.id !== editBill?.id,
    );
    if (dup) errs.month = `Веќе постои сметка за ${MACEDONIAN_MONTHS[form.month - 1]} ${form.year}`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      month: form.month,
      year: form.year,
      virtuseElias: form.virtuseElias,
      evn: form.evn,
      vodovod: form.vodovod,
      internetTv: form.internetTv,
      a1: form.a1,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editBill) {
      onUpdate(editBill.id, data);
    } else {
      onSave(data);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="bill-form-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="bill-form-title" className={styles.modalTitle}>
            {editBill ? 'Уреди сметка' : 'Додај нова сметка'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Затвори">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-month">Месец</label>
              <select
                id="bill-month"
                ref={firstRef}
                value={form.month}
                onChange={(e) => set('month', Number(e.target.value))}
              >
                {MACEDONIAN_MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              {errors.month && <span className={styles.error}>{errors.month}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-year">Година</label>
              <input
                id="bill-year"
                type="number"
                value={form.year}
                min={2000}
                max={2100}
                onChange={(e) => set('year', Number(e.target.value))}
              />
              {errors.year && <span className={styles.error}>{errors.year}</span>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-virtuse">{cats.virtuseElias} (ден.)</label>
              <input
                id="bill-virtuse"
                type="number"
                min={0}
                value={form.virtuseElias}
                onChange={(e) => numField('virtuseElias', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-evn">{cats.evn} (ден.)</label>
              <input
                id="bill-evn"
                type="number"
                min={0}
                value={form.evn}
                onChange={(e) => numField('evn', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-vodovod">{cats.vodovod} (ден.)</label>
              <input
                id="bill-vodovod"
                type="number"
                min={0}
                value={form.vodovod}
                onChange={(e) => numField('vodovod', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bill-internet">{cats.internetTv} (ден.)</label>
              <input
                id="bill-internet"
                type="number"
                min={0}
                value={form.internetTv}
                onChange={(e) => numField('internetTv', e.target.value)}
              />
            </div>
          </div>

          {house.hasA1 && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="bill-a1">{cats.a1} (ден.)</label>
                <input
                  id="bill-a1"
                  type="number"
                  min={0}
                  value={form.a1}
                  onChange={(e) => numField('a1', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className={styles.totalPreview}>
            <span className={styles.totalLabel}>Вкупно</span>
            <span className={styles.totalAmount}>{formatMKD(total)}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Статус</label>
            <div className={styles.statusToggle}>
              <button
                type="button"
                className={`${styles.statusBtn} ${styles.statusBtnPaid} ${form.status === 'paid' ? styles.active : ''}`}
                onClick={() => set('status', 'paid')}
              >
                Платено
              </button>
              <button
                type="button"
                className={`${styles.statusBtn} ${styles.statusBtnUnpaid} ${form.status === 'unpaid' ? styles.active : ''}`}
                onClick={() => set('status', 'unpaid')}
              >
                Неплатено
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="bill-notes">Белешки (опционално)</label>
            <textarea
              id="bill-notes"
              rows={3}
              placeholder="Дополнителни белешки..."
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Откажи</button>
          <button className={styles.saveBtn} onClick={handleSubmit}>
            {editBill ? 'Зачувај промени' : 'Додај сметка'}
          </button>
        </div>
      </div>
    </div>
  );
}
