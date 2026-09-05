import { useState, useCallback } from 'react';
import { GmailClient, getBodyText, getAttachments, getSubject, getMessageDate } from '../lib/gmail';
import { parseByLabel } from '../lib/parsers';
import type { LabelName } from '../lib/parsers';
import { mergeGmailBill } from '../lib/billMerger';
import { useSettings } from '../context/SettingsContext';

const VLAE_LABELS:  LabelName[] = ['EVN - smetki', 'Smetki Virtus', 'Vodovod'];
const RESEN_LABELS: LabelName[] = ['A1'];
const MONTHS_BACK = 3;

export interface FetchResult {
  inserted: number;
  skipped: number;
}

export function useFetchBills(accessToken: string | null) {
  const { settings } = useSettings();
  const labels = settings.activeHouseId === 'resen' ? RESEN_LABELS : VLAE_LABELS;

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<FetchResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    if (!accessToken) { setError('Not connected to Google.'); return; }
    setLoading(true); setResult(null); setError(null);
    let inserted = 0, skipped = 0;
    try {
      const gmail = new GmailClient(accessToken);
      const after = (() => { const d = new Date(); d.setMonth(d.getMonth() - MONTHS_BACK); return d; })();

      for (const label of labels) {
        let messages;
        try { messages = await gmail.listMessages(label, after); }
        catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('403') || msg.includes('401') || msg.includes('нема пристап')) throw err;
          continue;
        }
        for (const msg of messages) {
          try {
            const detail = await gmail.getMessage(msg.id);
            const subject = getSubject(detail);
            const bill = await parseByLabel(
              label, getBodyText(detail), msg.id,
              subject, getAttachments(detail), gmail, getMessageDate(detail),
            );
            if (!bill) {
              console.warn(`[${label}] could not parse "${subject}"`);
              skipped++; continue;
            }
            if (mergeGmailBill(bill)) inserted++; else skipped++;
          } catch (err) {
            console.warn(`[${label}] message ${msg.id} threw during parse`, err);
            skipped++;
          }
        }
      }
      setResult({ inserted, skipped });
    } catch (err) { setError(err instanceof Error ? err.message : 'Fetch failed'); }
    finally { setLoading(false); }
  }, [accessToken, labels]);

  const toastMessage: string | null = result
    ? result.inserted > 0
      ? `Внесени ${result.inserted} нов${result.inserted === 1 ? 'а' : 'и'} сметк${result.inserted === 1 ? 'а' : 'и'}`
      : 'Нема нови сметки'
    : null;

  return { fetchBills, loading, result, toastMessage, error };
}
