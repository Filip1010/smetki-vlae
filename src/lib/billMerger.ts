import type { Bill } from '../types/bill';
import type { GmailBill, GmailBillProvider } from '../types/bill';
import { computeTotal } from '../utils/calculations';

const INTERNET_TV_DEFAULT = 1150;

const PROCESSED_KEY = 'gmail-processed-ids';

// Custom event that useBills listens to for refreshing React state
const UPDATE_EVENT = 'gmail-bills-updated';

const HOUSE_STORAGE: Record<'vlae' | 'resen', string> = {
  vlae: 'smetki-vlae-bills',
  resen: 'smetki-resen-bills',
};

const PROVIDER_FIELD: Record<GmailBillProvider, keyof Pick<Bill, 'evn' | 'vodovod' | 'virtuseElias' | 'a1'>> = {
  EVN: 'evn',
  Vodovod: 'vodovod',
  Virtus: 'virtuseElias',
  A1: 'a1',
};

function loadProcessedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markProcessed(messageId: string) {
  const ids = loadProcessedIds();
  ids.add(messageId);
  localStorage.setItem(PROCESSED_KEY, JSON.stringify([...ids]));
}

function loadBills(storageKey: string): Bill[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const bills = raw ? (JSON.parse(raw) as Bill[]) : [];
    return bills.map((b) => ({ ...b, a1: b.a1 ?? 0 }));
  } catch {
    return [];
  }
}

function saveBills(storageKey: string, bills: Bill[]) {
  localStorage.setItem(storageKey, JSON.stringify(bills));
}

/**
 * Merges a fetched GmailBill into the existing per-house Bill storage.
 *
 * - If a Bill for the same month/year exists: updates only the provider field.
 * - If not: creates a new Bill with internetTv pre-filled to INTERNET_TV_DEFAULT.
 * - Skips if the gmailMessageId was already processed (deduplication).
 *
 * Returns true when the bill was inserted or updated, false when skipped.
 */
export function mergeGmailBill(gmailBill: GmailBill, forceInsert = false): boolean {
  if (!gmailBill.month) return false;

  const parts = gmailBill.month.split('/');
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(year)) return false;

  const storageKey = HOUSE_STORAGE[gmailBill.houseId];
  const bills = loadBills(storageKey);
  const field = PROVIDER_FIELD[gmailBill.provider];
  const now = new Date().toISOString();

  const idx = forceInsert ? -1 : bills.findIndex((b) => b.month === month && b.year === year);

  // A message seen before is normally skipped. The exception is a month whose
  // amount for this provider is missing again — a sheet round-trip can blank it
  // out — in which case re-apply it. A month with no record at all was deleted
  // on purpose, so leave it deleted.
  if (!forceInsert && loadProcessedIds().has(gmailBill.gmailMessageId)) {
    if (idx < 0 || bills[idx][field] > 0) return false;
  }

  if (idx >= 0) {
    const updated = { ...bills[idx], [field]: gmailBill.amount, updatedAt: now };
    updated.total = computeTotal(updated);
    bills[idx] = updated;
  } else {
    const base: Bill = {
      id: crypto.randomUUID(),
      month,
      year,
      virtuseElias: 0,
      evn: 0,
      vodovod: 0,
      internetTv: INTERNET_TV_DEFAULT,
      a1: 0,
      total: 0,
      status: 'unpaid',
      createdAt: now,
      updatedAt: now,
    };
    base[field] = gmailBill.amount;
    base.total = computeTotal(base);
    bills.push(base);
  }

  saveBills(storageKey, bills);
  if (!forceInsert) markProcessed(gmailBill.gmailMessageId);
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  return true;
}

/**
 * Collapses duplicate bills that share the same month+year in a single house
 * storage key. When duplicates exist they are merged into one record by taking
 * the highest non-zero value for every provider field. The winner keeps the
 * earliest createdAt and the latest updatedAt.
 *
 * Called automatically on app load and after every Gmail sync.
 */
export function deduplicateHouseBills(storageKey: string): void {
  const bills = loadBills(storageKey);
  const map = new Map<string, Bill>();

  for (const bill of bills) {
    const key = `${bill.year}-${bill.month}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...bill });
      continue;
    }
    // Merge: keep highest non-zero amounts, earliest createdAt, latest updatedAt
    const merged: Bill = {
      ...existing,
      virtuseElias: Math.max(existing.virtuseElias, bill.virtuseElias),
      evn:          Math.max(existing.evn,          bill.evn),
      vodovod:      Math.max(existing.vodovod,       bill.vodovod),
      internetTv:   Math.max(existing.internetTv,    bill.internetTv),
      a1:           Math.max(existing.a1,            bill.a1),
      status:       'unpaid',   // always — user toggles to paid manually
      notes:        [existing.notes, bill.notes].filter(Boolean).join(' ').trim() || undefined,
      createdAt:    existing.createdAt < bill.createdAt ? existing.createdAt : bill.createdAt,
      updatedAt:    existing.updatedAt > bill.updatedAt ? existing.updatedAt : bill.updatedAt,
    };
    merged.total = computeTotal(merged);
    map.set(key, merged);
  }

  const deduped = [...map.values()];
  if (deduped.length !== bills.length) {
    saveBills(storageKey, deduped);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }
}

/** Runs deduplication across both houses. Safe to call on every load. */
export function deduplicateAllBills(): void {
  deduplicateHouseBills(HOUSE_STORAGE.vlae);
  deduplicateHouseBills(HOUSE_STORAGE.resen);
}

export { UPDATE_EVENT as GMAIL_UPDATE_EVENT };
