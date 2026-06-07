import { useEffect, useRef, useState } from 'react';
import { useGoogleSheets } from '../../context/GoogleSheetsContext';
import { useFetchBills } from '../../hooks/useFetchBills';
import styles from './GmailSyncButton.module.css';

export default function GmailSyncButton() {
  const { isConnected, accessToken } = useGoogleSheets();
  const { fetchBills, loading, toastMessage, error } = useFetchBills(accessToken);
  const [flash, setFlash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const msg = toastMessage ?? (error ? `Грешка: ${error}` : null);
    if (!msg) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setFlash(msg);
    timerRef.current = setTimeout(() => setFlash(null), 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toastMessage, error]);

  // Auto-fetch once whenever the user connects (or reconnects) to Google
  useEffect(() => {
    if (isConnected && accessToken) {
      void fetchBills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  if (!isConnected) return null;

  return (
    <button
      className={`${styles.btn} ${loading ? styles.btnLoading : ''}`}
      onClick={() => { void fetchBills(); }}
      disabled={loading}
      title="Земи нови сметки од Gmail (последни 3 месеци)"
    >
      <svg
        className={`${styles.icon} ${loading ? styles.iconSpin : ''}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
      <span className={styles.label}>{flash ?? (loading ? 'Зема…' : 'Gmail')}</span>
    </button>
  );
}
