import { useGoogleSheets } from '../context/GoogleSheetsContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { connect, isConfigured } = useGoogleSheets();

  return (
    <div className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.cardGlow} aria-hidden="true" />

        <div className={styles.logoWrap}>
          <svg className={styles.logoIcon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 5L4 18h4v17h10V25h4v10h10V18h4L20 5z" fill="currentColor" opacity="0.15"/>
            <path d="M20 5L4 18h4v17h10V25h4v10h10V18h4L20 5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="16" y="25" width="8" height="10" rx="1" fill="currentColor" opacity="0.4"/>
          </svg>
        </div>

        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Сметки</h1>
          <p className={styles.subtitle}>Кузманоски Филип</p>
        </div>

        <div className={styles.divider} aria-hidden="true">
          <span className={styles.dividerLine} />
          <span className={styles.dividerDot} />
          <span className={styles.dividerLine} />
        </div>

        <ul className={styles.features} aria-hidden="true">
          <li><span className={styles.featureDot} />Следење на сметки по имот</li>
          <li><span className={styles.featureDot} />Плаќање на сите месечни трошоци со еден клик</li>
          <li><span className={styles.featureDot} />Синхронизација со Google Sheets</li>
          <li><span className={styles.featureDot} />Автоматски увоз преку Gmail</li>
          <li><span className={styles.featureDot} />Визуелна анализа и историја на трошоци по имот за целиот период</li>
          <li><span className={styles.featureDot} />Преглед на вкупни месечни и годишни трошоци по имот</li>
        </ul>

        <button
          className={styles.googleBtn}
          onClick={connect}
          disabled={!isConfigured}
          aria-label="Пријави се со Google"
        >
          <svg className={styles.googleLogo} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Продолжи со Google</span>
        </button>

        {!isConfigured && (
          <p className={styles.configError}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Google Client ID не е конфигуриран
          </p>
        )}

        <p className={styles.privacy}>
          Со пријавувањето се согласувате со пристап до вашиот Gmail и Sheets.
        </p>
      </div>
    </div>
  );
}
