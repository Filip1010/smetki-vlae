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
