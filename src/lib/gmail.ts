const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me';

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers?: { name: string; value: string }[];
  body: { attachmentId?: string; size: number; data?: string };
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail {
  id: string;
  labelIds: string[];
  payload: GmailMessagePart;
}

export class GmailClient {
  // Label name → label ID cache (lives for the lifetime of this client instance)
  private labelCache = new Map<string, string>();

  constructor(private readonly accessToken: string) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${GMAIL_API}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        'Gmail: нема пристап (403). Исклучи се и поврзи повторно за да го одобриш Gmail пристапот.',
      );
    }
    if (!res.ok) throw new Error(`Gmail API ${path} HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  private async resolveLabelId(labelName: string): Promise<string | null> {
    if (this.labelCache.size === 0) {
      const result = await this.get<{ labels?: { id: string; name: string }[] }>('/labels');
      for (const label of result.labels ?? []) {
        this.labelCache.set(label.name, label.id);
      }
    }
    return this.labelCache.get(labelName) ?? null;
  }

  /** Lists messages in the given label. Pass `after` to limit by date (omit for all). */
  async listMessages(labelName: string, after?: Date): Promise<GmailMessage[]> {
    const labelId = await this.resolveLabelId(labelName);
    if (!labelId) {
      console.warn(`Gmail: label "${labelName}" not found`);
      return [];
    }
    const params: Record<string, string> = { labelIds: labelId, maxResults: '100' };
    if (after) params['q'] = `after:${Math.floor(after.getTime() / 1000)}`;
    const result = await this.get<{ messages?: GmailMessage[] }>('/messages', params);
    return result.messages ?? [];
  }

  async getMessage(messageId: string): Promise<GmailMessageDetail> {
    return this.get<GmailMessageDetail>(`/messages/${messageId}`, { format: 'full' });
  }

  /** Returns the raw base64url-encoded attachment data. */
  async getAttachment(messageId: string, attachmentId: string): Promise<string> {
    const result = await this.get<{ data: string }>(
      `/messages/${messageId}/attachments/${attachmentId}`,
    );
    return result.data;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Gmail body parts are base64url-encoded UTF-8.
// atob() gives a Latin-1 binary string — must re-decode as UTF-8 to get Cyrillic right.
function decodeBase64(data: string): string {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
}

export function getBodyText(message: GmailMessageDetail): string {
  let plain = '';
  let html = '';

  function walk(part: GmailMessagePart) {
    if (part.body.data) {
      const decoded = decodeBase64(part.body.data);
      if (part.mimeType === 'text/plain') plain += decoded + '\n';
      else if (part.mimeType === 'text/html') html += decoded + '\n';
    }
    (part.parts ?? []).forEach(walk);
  }

  walk(message.payload);

  // Always combine both: some emails put the amount only in HTML, others only in plain text.
  return [plain.trim(), htmlToText(html)].filter(Boolean).join('\n');
}

export function getAttachments(
  message: GmailMessageDetail,
): { id: string; mimeType: string; filename: string }[] {
  const result: { id: string; mimeType: string; filename: string }[] = [];
  function walk(part: GmailMessagePart) {
    if (part.body.attachmentId) {
      result.push({ id: part.body.attachmentId, mimeType: part.mimeType, filename: part.filename });
    }
    (part.parts ?? []).forEach(walk);
  }
  walk(message.payload);
  return result;
}

export function getSubject(message: GmailMessageDetail): string {
  return (
    message.payload.headers?.find((h) => h.name.toLowerCase() === 'subject')?.value ?? ''
  );
}
