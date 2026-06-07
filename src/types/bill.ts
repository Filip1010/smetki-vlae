export type PaymentStatus = 'paid' | 'unpaid';

export interface Bill {
  id: string;
  month: number;
  year: number;
  virtuseElias: number;
  evn: number;
  vodovod: number;
  internetTv: number;
  a1: number;
  total: number;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillFilters {
  year: number | 'all';
  status: PaymentStatus | 'all';
  search: string;
}

export type BillSortKey = 'month' | 'total' | 'evn' | 'virtuseElias' | 'vodovod' | 'internetTv' | 'a1';
export type SortDirection = 'asc' | 'desc';

export type GmailBillProvider = 'A1' | 'EVN' | 'Vodovod' | 'Virtus';

export interface GmailBill {
  id: string;
  provider: GmailBillProvider;
  houseId: 'vlae' | 'resen';
  month: string;          // "MM/YYYY"
  amount: number;         // MKD, always > 0
  dueDate: string;        // "YYYY-MM-DD"
  invoiceNumber: string | null;
  gmailMessageId: string;
  fetchedAt: string;      // ISO timestamp
  status: 'unpaid';       // always on insert; toggled manually in UI
}
