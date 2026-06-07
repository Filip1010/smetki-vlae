import type { GmailBill } from '../../types/bill';
import { parseMKDAmount, parseDate, parseMonth } from '../normalize';

export function parseA1(body: string, messageId: string): GmailBill | null {
  const amountMatch = body.match(/Износ:\s*([\d.,]+)\s*ден/);
  if (!amountMatch) return null;
  const amount = parseMKDAmount(amountMatch[1]);
  if (!amount) return null;

  const monthMatch = body.match(/Сметка за месец:\s*(\d{1,2}\/\d{4})/);
  const dueDateMatch = body.match(/Рок на плаќање:\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
  const invoiceMatch = body.match(/Број на фактура:\s*(\d+)/);

  return {
    id: crypto.randomUUID(),
    provider: 'A1',
    houseId: 'resen',
    month: monthMatch ? (parseMonth(monthMatch[1]) ?? '') : '',
    amount,
    dueDate: dueDateMatch ? (parseDate(dueDateMatch[1]) ?? '') : '',
    invoiceNumber: invoiceMatch ? invoiceMatch[1] : null,
    gmailMessageId: messageId,
    fetchedAt: new Date().toISOString(),
    status: 'unpaid',
  };
}
