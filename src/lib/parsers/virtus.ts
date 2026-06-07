import type { GmailBill } from '../../types/bill';
import { parseMKDAmount, parseMonth } from '../normalize';
import type { GmailClient } from '../gmail';

// Exported for unit testing without touching the PDF stack.
export function extractGrandTotal(pdfText: string): number | null {
  const lines = pdfText.split('\n');
  const dospeansIdx = lines.findIndex((l) => l.includes('Доспеан долг'));
  const searchLines = dospeansIdx >= 0 ? lines.slice(0, dospeansIdx) : lines;

  // Walk backwards: first standalone MK-format number wins
  for (let i = searchLines.length - 1; i >= 0; i--) {
    const line = searchLines[i].trim();
    if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(line)) {
      const n = parseMKDAmount(line);
      if (n) return n;
    }
  }
  return null;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pdfToText(bytes: Uint8Array): Promise<string> {
  // Lazy-load pdfjs-dist so the worker URL is only resolved in the browser.
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl as string;
  }

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join('\n'),
    );
  }
  return pages.join('\n');
}

export async function parseVirtus(
  messageId: string,
  subject: string,
  attachments: { id: string; mimeType: string }[],
  gmail: GmailClient,
): Promise<GmailBill | null> {
  const pdfAtt = attachments.find((a) => a.mimeType === 'application/pdf');
  if (!pdfAtt) return null;

  let pdfText: string;
  try {
    const b64 = await gmail.getAttachment(messageId, pdfAtt.id);
    const bytes = base64ToUint8Array(b64);
    pdfText = await pdfToText(bytes);
  } catch {
    return null;
  }

  const amount = extractGrandTotal(pdfText);
  if (!amount) return null;

  // Invoice number: pattern like "5-2026-0-0-485-12345" in subject or PDF
  const invoiceMatch = (subject + '\n' + pdfText).match(/\d+-\d+-\d+-\d+-\d+-\d+/);
  const invoiceNumber = invoiceMatch ? invoiceMatch[0] : null;

  // Month from subject or first line of PDF
  const monthRaw = (subject + '\n' + pdfText).match(/(\d{1,2}[\/\-]\d{4})/);
  const month = monthRaw ? (parseMonth(monthRaw[1]) ?? '') : '';

  // Due date: 20th of the month following the invoice month
  let dueDate = '';
  if (month) {
    const [mm, yyyy] = month.split('/');
    let mo = parseInt(mm, 10) + 1;
    let yr = parseInt(yyyy, 10);
    if (mo > 12) { mo = 1; yr++; }
    dueDate = `${yr}-${String(mo).padStart(2, '0')}-20`;
  }

  return {
    id: crypto.randomUUID(),
    provider: 'Virtus',
    houseId: 'vlae',
    month,
    amount,
    dueDate,
    invoiceNumber,
    gmailMessageId: messageId,
    fetchedAt: new Date().toISOString(),
    status: 'unpaid',
  };
}
