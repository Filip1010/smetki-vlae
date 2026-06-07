/**
 * Parses a Macedonian-formatted number.
 * "." = thousands separator, "," = decimal (e.g. "2.013,00" → 2013).
 * Also handles plain decimal format (e.g. "4293.00" → 4293).
 */
export function parseMKDAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  if (s.includes(',')) {
    // MK format: strip thousand-dots, swap comma→dot
    s = s.replace(/\./g, '').replace(',', '.');
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
