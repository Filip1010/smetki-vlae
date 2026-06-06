import React, { createContext, useContext } from 'react';
import { useBills } from '../hooks/useBills';

type BillsContextValue = ReturnType<typeof useBills>;

const BillsContext = createContext<BillsContextValue | null>(null);

export function BillsProvider({ children }: { children: React.ReactNode }) {
  const value = useBills();
  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBillsContext(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error('useBillsContext must be used within BillsProvider');
  return ctx;
}
