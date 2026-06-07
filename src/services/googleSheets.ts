import type { Bill } from '../types/bill';
import type { HouseCategories } from '../data/houses';

const SPREADSHEET_ID = '1rhHWacY0yeYYmSfYuciaH7HiI1AMTGylAQa1cku3SEE';
const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Column layout (A:J, 10 cols):
// A=Месец B=Година C=VE D=ЕВН E=Водовод F=ИнтТВ G=А1 H=Вкупно I=Статус J=Забел

const DEFAULT_CATS: HouseCategories = {
  virtuseElias: 'Виртус Елиас', evn: 'ЕВН', vodovod: 'Водовод', internetTv: 'Интернет и ТВ', a1: 'А1',
};

function buildHeaders(cats: HouseCategories = DEFAULT_CATS): string[] {
  return [
    'Месец', 'Година',
    `${cats.virtuseElias} (ден.)`, `${cats.evn} (ден.)`,
    `${cats.vodovod} (ден.)`, `${cats.internetTv} (ден.)`, `${cats.a1} (ден.)`,
    'Вкупно (ден.)', 'Статус', 'Забелешки',
  ];
}

const MK_MONTHS = [
  'Јануари', 'Февруари', 'Март', 'Април', 'Мај', 'Јуни',
  'Јули', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември',
];

const COLOR_HEADER_BG   = { red: 0.051, green: 0.106, blue: 0.243 };
const COLOR_HEADER_TEXT = { red: 0.784, green: 0.663, blue: 0.318 };
const COLOR_PAID_BG     = { red: 0.878, green: 0.957, blue: 0.882 };
const COLOR_UNPAID_BG   = { red: 0.996, green: 0.894, blue: 0.894 };
const COLOR_STRIPE      = { red: 0.973, green: 0.976, blue: 0.984 };
const COLOR_BORDER_DARK = { red: 0.051, green: 0.106, blue: 0.243 };
const COLOR_BORDER_LITE = { red: 0.878, green: 0.886, blue: 0.906 };

function monthToName(month: number): string { return MK_MONTHS[month - 1] ?? String(month); }
function nameToMonth(val: string | number): number {
  const idx = MK_MONTHS.findIndex((m) => m.toLowerCase() === String(val).toLowerCase());
  return idx >= 0 ? idx + 1 : Number(val);
}
function toDisplay(status: Bill['status']): string { return status === 'paid' ? 'Платено' : 'Неплатено'; }
function fromDisplay(val: string | number): Bill['status'] {
  return String(val).toLowerCase().startsWith('плат') || String(val).toLowerCase() === 'paid' ? 'paid' : 'unpaid';
}

export class UnauthorizedError extends Error {
  constructor() { super('Google access token expired or invalid'); this.name = 'UnauthorizedError'; }
}

async function checkResponse(resp: Response): Promise<Response> {
  if (resp.ok) return resp;
  let message = `${resp.status} ${resp.statusText}`;
  try { const b = await resp.clone().json(); if (b?.error?.message) message = b.error.message; } catch { /* ignore */ }
  if (resp.status === 401) throw new UnauthorizedError();
  throw new Error(message);
}

// ─── Tab management ──────────────────────────────────────────────────────────

const tabSheetIdCache = new Map<string, number>();

export function resetTabCache() { tabSheetIdCache.clear(); }

async function fetchSheets(token: string): Promise<{ title: string; sheetId: number }[]> {
  const resp = await fetch(`${API_BASE}/${SPREADSHEET_ID}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await checkResponse(resp);
  const data = await resp.json();
  return (data.sheets ?? []).map((s: { properties: { title: string; sheetId: number } }) => s.properties);
}

async function getOrCreateAppTab(token: string, tab: string): Promise<number> {
  const cached = tabSheetIdCache.get(tab);
  if (cached !== undefined) return cached;

  const sheets = await fetchSheets(token);
  const existing = sheets.find((s) => s.title === tab);
  if (existing) { tabSheetIdCache.set(tab, existing.sheetId); return existing.sheetId; }

  const resp = await fetch(`${API_BASE}/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
  });
  await checkResponse(resp);
  const data = await resp.json();
  const sheetId: number = data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  tabSheetIdCache.set(tab, sheetId);
  return sheetId;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

async function applyFormatting(token: string, sheetId: number, bills: Bill[]): Promise<void> {
  const sorted = [...bills].sort((a, b) => a.year - b.year || a.month - b.month);
  const rowCount = sorted.length;

  const solid = (color: object, width = 1) => ({ style: 'SOLID', colorStyle: { rgbColor: color }, width });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req: any[] = [];

  // 1. Clear old background
  req.push({ repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 500 }, cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } }, fields: 'userEnteredFormat.backgroundColor' } });

  // 2. Header row (A:J = 10 cols)
  req.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: { backgroundColor: COLOR_HEADER_BG, textFormat: { foregroundColor: COLOR_HEADER_TEXT, bold: true, fontSize: 10 }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', padding: { top: 6, bottom: 6, left: 8, right: 8 } } },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)',
    },
  });

  // 3. Freeze + row heights
  req.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } });
  req.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 38 }, fields: 'pixelSize' } });
  if (rowCount > 0) req.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: rowCount + 1 }, properties: { pixelSize: 28 }, fields: 'pixelSize' } });

  // 4. Column widths: Месец|Год|VE|ЕВН|Вод|ИнтТВ|А1|Вкупно|Статус|Забел
  [120, 72, 140, 100, 112, 155, 100, 128, 118, 220].forEach((pixelSize, i) => {
    req.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize }, fields: 'pixelSize' } });
  });

  if (rowCount > 0) {
    // 5. Base data-row format
    req.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rowCount + 1 },
        cell: { userEnteredFormat: { textFormat: { fontSize: 10 }, verticalAlignment: 'MIDDLE', padding: { top: 3, bottom: 3, left: 8, right: 8 } } },
        fields: 'userEnteredFormat(textFormat,verticalAlignment,padding)',
      },
    });

    // 6. Number format + right-align amount cols C-H (indices 2-7)
    for (let col = 2; col <= 7; col++) {
      req.push({ repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: rowCount + 1, startColumnIndex: col, endColumnIndex: col + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' }, horizontalAlignment: 'RIGHT' } }, fields: 'userEnteredFormat(numberFormat,horizontalAlignment)' } });
    }

    // 7. Center Месец(0), Година(1), Статус(8)
    [0, 1, 8].forEach((col) => {
      req.push({ repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: rowCount + 1, startColumnIndex: col, endColumnIndex: col + 1 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } });
    });

    // 8. Bold Вкупно col H (index 7)
    req.push({ repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: rowCount + 1, startColumnIndex: 7, endColumnIndex: 8 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } });

    // 9. Per-row status colors
    sorted.forEach((bill, i) => {
      const rowIndex = i + 1;
      const isPaid = bill.status === 'paid';
      const isEven = i % 2 === 0;
      req.push({ repeatCell: { range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1 }, cell: { userEnteredFormat: { backgroundColor: isPaid ? (isEven ? COLOR_PAID_BG : { red: 0.855, green: 0.937, blue: 0.859 }) : (isEven ? COLOR_UNPAID_BG : { red: 0.988, green: 0.871, blue: 0.871 }), textFormat: { foregroundColor: isPaid ? { red: 0.106, green: 0.408, blue: 0.145 } : { red: 0.588, green: 0.118, blue: 0.118 } } } }, fields: 'userEnteredFormat(backgroundColor,textFormat.foregroundColor)' } });
      void COLOR_STRIPE;
    });
  }

  // 10. Table borders
  req.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: rowCount + 1, endColumnIndex: 10 },
      top: solid(COLOR_BORDER_DARK, 2), bottom: solid(COLOR_BORDER_DARK, 2),
      left: solid(COLOR_BORDER_DARK, 2), right: solid(COLOR_BORDER_DARK, 2),
      innerHorizontal: solid(COLOR_BORDER_LITE), innerVertical: solid(COLOR_BORDER_LITE),
    },
  });

  await fetch(`${API_BASE}/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: req }),
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

type SheetRow = Pick<Bill, 'month' | 'year' | 'virtuseElias' | 'evn' | 'vodovod' | 'internetTv' | 'a1' | 'total' | 'status' | 'notes'>;

export async function readBillsFromSheet(token: string, tab: string): Promise<SheetRow[]> {
  await getOrCreateAppTab(token, tab);
  const range = encodeURIComponent(`${tab}!A:J`);
  const resp = await fetch(
    `${API_BASE}/${SPREADSHEET_ID}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  await checkResponse(resp);
  const data = await resp.json();
  const rows: (string | number)[][] = data.values ?? [];
  if (rows.length < 2) return [];
  return rows
    .slice(1)
    .map((row) => ({
      month: nameToMonth(row[0]), year: Number(row[1]),
      virtuseElias: Number(row[2]) || 0,
      evn: Number(row[3]) || 0,
      vodovod: Number(row[4]) || 0,
      internetTv: Number(row[5]) || 0,
      a1: Number(row[6]) || 0,
      total: Number(row[7]) || 0,
      status: fromDisplay(row[8]),
      notes: row[9] ? String(row[9]) : undefined,
    }))
    .filter((b) => b.month > 0 && b.year > 0);
}

function dedupeSheetRows(rows: SheetRow[]): SheetRow[] {
  const map = new Map<string, SheetRow>();
  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    const ex = map.get(key);
    if (!ex) { map.set(key, { ...row }); continue; }
    const ve = Math.max(ex.virtuseElias, row.virtuseElias);
    const evn = Math.max(ex.evn, row.evn);
    const vod = Math.max(ex.vodovod, row.vodovod);
    const itv = Math.max(ex.internetTv, row.internetTv);
    const a1  = Math.max(ex.a1,  row.a1);
    map.set(key, {
      ...ex,
      virtuseElias: ve, evn, vodovod: vod, internetTv: itv, a1,
      total: ve + evn + vod + itv + a1,
      status: ex.status === 'paid' || row.status === 'paid' ? 'paid' : 'unpaid',
      notes: [ex.notes, row.notes].filter(Boolean).join(' ').trim() || undefined,
    });
  }
  return [...map.values()];
}

export function mergeSheetIntoBills(sheetRows: SheetRow[], localBills: Bill[]): Bill[] {
  const deduped = dedupeSheetRows(sheetRows);
  const localMap = new Map(localBills.map((b) => [`${b.year}-${b.month}`, b]));
  const sheetKeys = new Set(deduped.map((r) => `${r.year}-${r.month}`));
  const now = new Date().toISOString();

  // Bills that exist in the sheet (update local with sheet values, or create new)
  const fromSheet = deduped.map((row) => {
    const existing = localMap.get(`${row.year}-${row.month}`);
    return existing
      ? { ...existing, ...row, updatedAt: now }
      : { ...row, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  });

  // Local-only bills (not in sheet) — always keep them, never drop
  const localOnly = localBills.filter((b) => !sheetKeys.has(`${b.year}-${b.month}`));

  return [...fromSheet, ...localOnly];
}

export async function writeBillsToSheet(
  token: string, bills: Bill[], tab: string, categories: HouseCategories = DEFAULT_CATS,
): Promise<void> {
  const sheetId = await getOrCreateAppTab(token, tab);
  const clearRange = encodeURIComponent(`${tab}!A:J`);

  const clearResp = await fetch(`${API_BASE}/${SPREADSHEET_ID}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  await checkResponse(clearResp);

  // Deduplicate by month-year before writing — prevents duplicate rows in the sheet
  const billMap = new Map<string, Bill>();
  for (const b of bills) {
    const key = `${b.year}-${b.month}`;
    const ex = billMap.get(key);
    if (!ex) { billMap.set(key, b); continue; }
    const ve = Math.max(ex.virtuseElias, b.virtuseElias);
    const evn = Math.max(ex.evn, b.evn);
    const vod = Math.max(ex.vodovod, b.vodovod);
    const itv = Math.max(ex.internetTv, b.internetTv);
    const a1  = Math.max(ex.a1, b.a1);
    billMap.set(key, {
      ...ex,
      virtuseElias: ve, evn, vodovod: vod, internetTv: itv, a1,
      total: ve + evn + vod + itv + a1,
      status: ex.status === 'paid' || b.status === 'paid' ? 'paid' : 'unpaid',
    });
  }
  const sorted = [...billMap.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  const values = [
    buildHeaders(categories),
    ...sorted.map((b) => [
      monthToName(b.month), b.year,
      b.virtuseElias, b.evn, b.vodovod, b.internetTv, b.a1,
      b.total, toDisplay(b.status), b.notes ?? '',
    ]),
  ];

  const writeRange = encodeURIComponent(`${tab}!A1`);
  const writeResp = await fetch(
    `${API_BASE}/${SPREADSHEET_ID}/values/${writeRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: `${tab}!A1`, majorDimension: 'ROWS', values }),
    },
  );
  await checkResponse(writeResp);

  applyFormatting(token, sheetId, bills).catch(() => { /* non-critical */ });
}

type Hashable = Pick<Bill, 'year' | 'month' | 'virtuseElias' | 'evn' | 'vodovod' | 'internetTv' | 'a1' | 'status'>;
export function billsHash(bills: Hashable[]): string {
  return [...bills]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((b) => `${b.year}-${b.month}:${b.virtuseElias},${b.evn},${b.vodovod},${b.internetTv},${b.a1}:${b.status}`)
    .join('|');
}
