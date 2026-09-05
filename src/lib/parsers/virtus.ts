import type { GmailBill } from '../../types/bill';
import { parseMKDAmount, parseMonth, monthFromDate, monthPrior } from '../normalize';
import type { GmailClient } from '../gmail';

// Everything below this heading is outstanding debt from earlier periods,
// never the amount due for the current invoice.
const DEBT_MARKER = 'Доспеан долг';

/** Money-shaped token. Alternation order matters: longest/most specific first. */
const MONEY_TOKEN = /\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+,\d{2}|\d+\.\d{2}|\d{2,}/g;

/** A line that is nothing but an amount (optionally followed by a currency word). */
const STANDALONE_AMOUNT =
  /^(\d{1,3}(?:\.\d{3})*|\d+)([.,]\d{2})?\s*(?:ден\.?|денари|мкд|MKD)?$/i;

// Labels that introduce the grand total, most specific first.
const TOTAL_LABELS = [
  /вкупно\s+за\s+(?:плаќање|уплата|наплата)/i,
  /износ\s+за\s+(?:плаќање|уплата)/i,
  /вкупен\s+износ(?:\s+за\s+плаќање)?/i,
  /за\s+уплата/i,
  /вкупно\s*:/i,
];

const MK_MONTH_NAMES = [
  'јануари', 'февруари', 'март', 'април', 'мај', 'јуни',
  'јули', 'август', 'септември', 'октомври', 'ноември', 'декември',
];

function bestAmountIn(text: string): number | null {
  const tokens = text.match(MONEY_TOKEN);
  if (!tokens) return null;
  // Prefer tokens carrying a decimal part — those are money, not row numbers.
  const withDecimals = tokens.filter((t) => /[.,]\d{2}$/.test(t));
  for (const t of withDecimals.length ? withDecimals : tokens) {
    const n = parseMKDAmount(t);
    if (n) return n;
  }
  return null;
}

/**
 * Finds an amount announced by one of the total labels. Looks on the label's
 * own line first, then on the two lines that follow — PDF text extraction
 * often pushes the figure of a table row onto a line of its own.
 */
function findLabelledAmount(lines: string[]): number | null {
  for (const label of TOTAL_LABELS) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(label);
      if (!m) continue;
      const onLine = bestAmountIn(lines[i].slice((m.index ?? 0) + m[0].length));
      if (onLine) return onLine;
      for (let j = i + 1; j <= Math.min(i + 2, lines.length - 1); j++) {
        if (!lines[j].trim()) continue;
        const near = bestAmountIn(lines[j]);
        if (near) return near;
      }
    }
  }
  return null;
}

/** Last line consisting solely of an amount. Decimal amounts win over bare integers. */
function findStandaloneAmount(lines: string[]): number | null {
  const candidates: { value: number; hasDecimals: boolean }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!STANDALONE_AMOUNT.test(line)) continue;
    const value = parseMKDAmount(line.replace(/[^\d.,]/g, ''));
    if (value) candidates.push({ value, hasDecimals: /[.,]\d{2}\s*\D*$/.test(line) });
  }
  if (!candidates.length) return null;
  const decimals = candidates.filter((c) => c.hasDecimals);
  const pool = decimals.length ? decimals : candidates;
  return pool[pool.length - 1].value;
}

// Exported for unit testing without touching the PDF stack.
export function extractGrandTotal(pdfText: string): number | null {
  const all = pdfText.split('\n');
  const debtIdx = all.findIndex((l) => l.includes(DEBT_MARKER));
  const lines = debtIdx >= 0 ? all.slice(0, debtIdx) : all;

  return findLabelledAmount(lines) ?? findStandaloneAmount(lines);
}

function isValidMonth(monthYear: string): boolean {
  const m = parseInt(monthYear.slice(0, 2), 10);
  const y = parseInt(monthYear.slice(3), 10);
  return m >= 1 && m <= 12 && y >= 2000 && y <= 2100;
}

/**
 * Resolves the billing month, trying the most explicit signals first and
 * falling back to the date the mail arrived, so a successfully parsed invoice
 * is never dropped for want of a month.
 */
export function extractMonth(text: string, messageDate: Date): { month: string; guessed: boolean } {
  // 1. "за месец 05/2026" / "период: 5-2026"
  const labelled = text.match(/(?:за\s+месец|период|месец)\s*:?\s*(\d{1,2}[/-]\d{4})/i);
  const fromLabel = labelled ? parseMonth(labelled[1]) : null;
  if (fromLabel && isValidMonth(fromLabel)) return { month: fromLabel, guessed: false };

  // 2. Macedonian month name followed by a year — "за мај 2026"
  const named = text.toLowerCase().match(
    new RegExp(`(${MK_MONTH_NAMES.join('|')})\\s+(20\\d{2})`),
  );
  if (named) {
    const idx = MK_MONTH_NAMES.indexOf(named[1]);
    if (idx >= 0) return { month: `${String(idx + 1).padStart(2, '0')}/${named[2]}`, guessed: false };
  }

  // 3. Any bare MM/YYYY or MM-YYYY token
  const bare = text.match(/\b(\d{1,2})[/-](20\d{2})\b/);
  if (bare) {
    const candidate = parseMonth(`${bare[1]}/${bare[2]}`);
    if (candidate && isValidMonth(candidate)) return { month: candidate, guessed: false };
  }

  // 4. A DD.MM.YYYY date — the earliest one is the invoice/period date
  const dates = [...text.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/g)]
    .map((d) => ({ day: parseInt(d[1], 10), mo: parseInt(d[2], 10), yr: parseInt(d[3], 10) }))
    .filter((d) => d.mo >= 1 && d.mo <= 12)
    .sort((a, b) => a.yr - b.yr || a.mo - b.mo || a.day - b.day);
  if (dates.length) {
    return { month: `${String(dates[0].mo).padStart(2, '0')}/${dates[0].yr}`, guessed: false };
  }

  // 5. Last resort — bills land in the inbox for the month just gone.
  const arrival = monthFromDate(messageDate);
  return { month: monthPrior(arrival) ?? arrival, guessed: true };
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Extracts text from a PDF twice over:
 *  - `lines` rebuilds the visual rows from each glyph run's Y position, so a
 *    label and its amount stay on one line (what the label patterns need).
 *  - `raw` is the naive one-run-per-line dump, which keeps a grand total that
 *    sits by itself standing alone (what the fallback scan needs).
 */
async function pdfToText(bytes: Uint8Array): Promise<{ lines: string; raw: string }> {
  // Lazy-load pdfjs-dist so the worker URL is only resolved in the browser.
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.mjs?url');
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl as string;
    } catch (err) {
      console.warn('[Virtus] PDF worker unavailable, falling back to main thread', err);
    }
  }

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const lineChunks: string[] = [];
  const rawChunks: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const it = item as { str: string; transform: number[] };
      if (!it.str.trim()) continue;
      rawChunks.push(it.str);
      // PDF origin is bottom-left; bucket Y so runs on one visual row group together.
      const y = Math.round(it.transform[5] / 2) * 2;
      const row = rows.get(y) ?? [];
      row.push({ x: it.transform[4], str: it.str });
      rows.set(y, row);
    }

    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const row = rows.get(y)!;
      lineChunks.push(
        row.sort((a, b) => a.x - b.x).map((r) => r.str).join(' ').replace(/\s+/g, ' ').trim(),
      );
    }
  }

  return { lines: lineChunks.join('\n'), raw: rawChunks.join('\n') };
}

function isPdf(att: { mimeType: string; filename?: string }): boolean {
  return att.mimeType === 'application/pdf' || /\.pdf$/i.test(att.filename ?? '');
}

export async function parseVirtus(
  messageId: string,
  subject: string,
  attachments: { id: string; mimeType: string; filename?: string }[],
  gmail: GmailClient,
  body = '',
  messageDate: Date = new Date(),
): Promise<GmailBill | null> {
  // Some senders label a PDF as application/octet-stream, so match the filename
  // too, and only fall back to any attachment when nothing looks like a PDF.
  const pdfAtt = attachments.find(isPdf) ?? attachments[0];

  let pdfText = { lines: '', raw: '' };
  if (pdfAtt) {
    try {
      const b64 = await gmail.getAttachment(messageId, pdfAtt.id);
      pdfText = await pdfToText(base64ToUint8Array(b64));
    } catch (err) {
      console.warn(`[Virtus] PDF extraction failed for "${subject}"`, err);
    }
  }

  // PDF first, then the mail body — some invoices only link to the document.
  const amount =
    extractGrandTotal(pdfText.lines) ??
    extractGrandTotal(pdfText.raw) ??
    extractGrandTotal(body);

  if (!amount) {
    console.warn(
      `[Virtus] no amount found in "${subject}" ` +
        `(attachments: ${attachments.map((a) => a.mimeType).join(', ') || 'none'}, ` +
        `pdf chars: ${pdfText.lines.length})`,
    );
    return null;
  }

  const haystack = [subject, pdfText.lines, body].filter(Boolean).join('\n');

  // Invoice number: pattern like "5-2026-0-0-485-12345" in the subject or PDF
  const invoiceMatch = haystack.match(/\d+-\d+-\d+-\d+-\d+-\d+/);

  const { month, guessed } = extractMonth(haystack, messageDate);
  if (guessed) console.warn(`[Virtus] month not stated in "${subject}", assuming ${month}`);

  // Due date: 20th of the month following the invoice month
  const [mm, yyyy] = month.split('/');
  let mo = parseInt(mm, 10) + 1;
  let yr = parseInt(yyyy, 10);
  if (mo > 12) { mo = 1; yr++; }
  const dueDate = `${yr}-${String(mo).padStart(2, '0')}-20`;

  return {
    id: crypto.randomUUID(),
    provider: 'Virtus',
    houseId: 'vlae',
    month,
    amount,
    dueDate,
    invoiceNumber: invoiceMatch ? invoiceMatch[0] : null,
    gmailMessageId: messageId,
    fetchedAt: new Date().toISOString(),
    status: 'unpaid',
  };
}
