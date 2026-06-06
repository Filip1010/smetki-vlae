import type { PaymentStatus } from '../../types/bill';
import styles from './StatusBadge.module.css';

interface Props {
  status: PaymentStatus;
  onClick?: () => void;
}

export default function StatusBadge({ status, onClick }: Props) {
  const label = status === 'paid' ? 'Платено' : 'Неплатено';
  return (
    <span
      className={`${styles.badge} ${status === 'paid' ? styles.paid : styles.unpaid}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? `Смени статус: ${label}` : label}
    >
      {label}
    </span>
  );
}
