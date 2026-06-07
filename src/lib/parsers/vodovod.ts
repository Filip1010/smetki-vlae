import type { GmailBill } from '../../types/bill';
import { parseMKDAmount, parseDate, parseMonth } from '../normalize';

export function parseVodovod(body: string, messageId: string): GmailBill | null {
  const amountMatch = body.match(/изнесува\s+([\d.,]+)\s+денари/i);
  if (!amountMatch) return null;
  const amount = parseMKDAmount(amountMatch[1]);
  if (!amount) return null;

  const monthMatch = body.match(/за месец\s+(\d{1,2}-\d{4})/i);
  const dueDateMatch = body.match(/рок на плаќање\s+(\d{1,2}\.\d{1,2}\.\d{4})/i);

  return {
    id: crypto.randomUUID(),
    provider: 'Vodovod',
    houseId: 'vlae',
    month: monthMatch ? (parseMonth(monthMatch[1]) ?? '') : '',
    amount,
    dueDate: dueDateMatch ? (parseDate(dueDateMatch[1]) ?? '') : '',
    invoiceNumber: null,
    gmailMessageId: messageId,
    fetchedAt: new Date().toISOString(),
    status: 'unpaid',
  };
}
