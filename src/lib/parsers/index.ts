import type { GmailBill } from '../../types/bill';
import { parseA1 } from './a1';
import { parseEVN } from './evn';
import { parseVodovod } from './vodovod';
import { parseVirtus } from './virtus';
import type { GmailClient } from '../gmail';

export type LabelName = 'A1' | 'EVN - smetki' | 'Smetki Virtus' | 'Vodovod';

export const LABEL_CONFIG: Record<LabelName, { provider: string; from: string; houseId: 'vlae' | 'resen' }> = {
  'A1':           { provider: 'A1',     from: 'A1-noreply@a1.mk',              houseId: 'resen' },
  'EVN - smetki': { provider: 'EVN',    from: 'efaktura@evnservice.mk',         houseId: 'vlae'  },
  'Smetki Virtus':{ provider: 'Virtus', from: 'faktura@virtuselias.mk',         houseId: 'vlae'  },
  'Vodovod':      { provider: 'Vodovod',from: 'no-reply@vodovod-skopje.com.mk', houseId: 'vlae'  },
};

export async function parseByLabel(
  label: LabelName,
  body: string,
  messageId: string,
  subject: string,
  attachments: { id: string; mimeType: string; filename?: string }[],
  gmail: GmailClient,
  messageDate: Date = new Date(),
): Promise<GmailBill | null> {
  switch (label) {
    case 'A1':            return parseA1(body, messageId);
    case 'EVN - smetki':  return parseEVN(body, messageId);
    case 'Vodovod':
      // The label also receives payment-confirmation emails — skip those.
      if (!subject.includes('Достава на сметка')) return null;
      return parseVodovod(body, messageId);
    case 'Smetki Virtus': return parseVirtus(messageId, subject, attachments, gmail, body, messageDate);
    default:              return null;
  }
}
