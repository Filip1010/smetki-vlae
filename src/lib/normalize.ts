/**
 * Parses a Macedonian-formatted number.
 * "." = thousands separator, "," = decimal (e.g. "2.013,00" → 2013).
 * Also handles plain decimal format (e.g. "4293.00" → 4293)
 * and dot-grouped thousands without decimals (e.g. "1.098" → 1098).
 */
export function parseMKDAmount(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    // MK format: strip thousand-dots, swap comma→dot
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Dot-grouped thousands, no decimal part — "1.098" is 1098, not 1.098.
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? null : n;
}

/**
 * Parses "DD.MM.YYYY" → "YYYY-MM-DD".
 */
export function parseDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Normalises month strings to "MM/YYYY".
 * Accepts "05/2026", "5/2026", "5-2026", "05-2026".
 */
export function parseMonth(raw: string): string | null {
  let m = raw.match(/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[1].padStart(2, '0')}/${m[2]}`;
  m = raw.match(/(\d{1,2})-(\d{4})/);
  if (m) return `${m[1].padStart(2, '0')}/${m[2]}`;
  return null;
}

/**
 * Returns the month one step before the given "MM/YYYY".
 */
export function monthPrior(monthYear: string): string | null {
  const m = monthYear.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  let mo = parseInt(m[1], 10) - 1;
  let yr = parseInt(m[2], 10);
  if (mo === 0) { mo = 12; yr--; }
  return `${String(mo).padStart(2, '0')}/${yr}`;
}

/** Formats a Date as "MM/YYYY". */
export function monthFromDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
