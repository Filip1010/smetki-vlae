import type { GmailBill } from '../../types/bill';
import { parseMKDAmount, parseDate, monthPrior } from '../normalize';

// Fallback patterns from most specific to least — EVN email format varies.
const EVN_AMOUNT_PATTERNS = [
  /износ\s+од\s+([\d.,]+)\s+денари/i,
  /вкупен\s+износ\s+за\s+плаќање[^0-9]*([\d.,]+)/i,
  /изнесува\s+([\d.,]+)\s+денари/i,
  /износ[^0-9]+([\d.,]+)\s*ден/i,
  /за\s+плаќање[^0-9]+([\d.,]+)/i,
  /сметка(?:та)?\s+(?:изнесува|е)[^0-9]*([\d.,]+)/i,
];

export function parseEVN(body: string, messageId: string): GmailBill | null {
  let amountMatch: RegExpMatchArray | null = null;
  for (const re of EVN_AMOUNT_PATTERNS) {
    amountMatch = body.match(re);
    if (amountMatch) break;
  }
  if (!amountMatch) return null;
  const amount = parseMKDAmount(amountMatch[1]);
  if (!amount) return null;

  const dueDateMatch = body.match(/рок на плаќање до\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);
  const invoiceMatch = body.match(/(ФЕ-\d+)/);

  const dueDate = dueDateMatch ? parseDate(dueDateMatch[1]) : null;

  // Billing month = one month prior to the due-date month
  let month = '';
  if (dueDate) {
    const dueMM = dueDate.slice(5, 7);
    const dueYY = dueDate.slice(0, 4);
    month = monthPrior(`${dueMM}/${dueYY}`) ?? '';
  }

  return {
    id: crypto.randomUUID(),
    provider: 'EVN',
    houseId: 'vlae',
    month,
    amount,
    dueDate: dueDate ?? '',
    invoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
    gmailMessageId: messageId,
    fetchedAt: new Date().toISOString(),
    status: 'unpaid',
  };
}
