import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useBillsContext } from './BillsContext';
import { useSettings } from './SettingsContext';
import { getHouse } from '../data/houses';
import { UnauthorizedError, billsHash, mergeSheetIntoBills, resetTabCache, readBillsFromSheet, writeBillsToSheet } from '../services/googleSheets';
import type { Bill } from '../types/bill';

const CLIENT_ID = (import.meta as { env: Record<string, string> }).env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ');
const POLL_MS = 10_000;

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface GoogleSheetsContextValue {
  isConfigured: boolean;
  isConnected: boolean;
  accessToken: string | null;
  syncStatus: SyncStatus;
  lastSynced: Date | null;
  syncError: string | null;
  connect: () => void;
  disconnect: () => void;
  syncNow: () => Promise<void>;
}

const GoogleSheetsContext = createContext<GoogleSheetsContextValue | null>(null);

export function useGoogleSheets(): GoogleSheetsContextValue {
  const ctx = useContext(GoogleSheetsContext);
  if (!ctx) throw new Error('useGoogleSheets must be used within GoogleSheetsProvider');
  return ctx;
}

function loadGSI(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as { google?: unknown }).google) { resolve(); return; }
    if (document.getElementById('gsi-script')) {
      const interval = setInterval(() => {
        if ((window as { google?: unknown }).google) { clearInterval(interval); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function GoogleSheetsProvider({ children }: { children: React.ReactNode }) {
  const { bills, replaceBills } = useBillsContext();
  const { settings } = useSettings();

  const activeHouse = getHouse(settings.activeHouseId);
  const activeTab = activeHouse.sheetTab;
  const activeTabRef = useRef(activeTab);
  const activeCatsRef = useRef(activeHouse.categories);

  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const tokenClientRef = useRef<{ requestAccessToken: (opts?: { prompt?: string }) => void } | null>(null);
  const lastPushedHashRef = useRef('');
  const billsRef = useRef<Bill[]>(bills);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { billsRef.current = bills; }, [bills]);

  const handleDisconnect = useCallback((err?: string) => {
    tokenRef.current = null;
    resetTabCache();
    setIsConnected(false);
    setSyncStatus(err ? 'error' : 'idle');
    if (err) setSyncError(err);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pullFromSheet = useCallback(async (token: string) => {
    const sheetRows = await readBillsFromSheet(token, activeTabRef.current);
    if (sheetRows.length === 0) return;
    const sheetHash = billsHash(sheetRows);
    const localHash = billsHash(billsRef.current);
    if (sheetHash === localHash) return;
    if (localHash !== lastPushedHashRef.current) return;
    const sheetTotal = sheetRows.reduce((s, b) => s + b.total, 0);
    const localTotal = billsRef.current.reduce((s, b) => s + b.total, 0);
    if (sheetTotal === 0 && localTotal > 0) return;
    lastPushedHashRef.current = sheetHash;
    replaceBills(mergeSheetIntoBills(sheetRows, billsRef.current));
  }, [replaceBills]);

  // On first connect (or house switch): pull from sheet if it has data, otherwise push local
  const initialSync = useCallback(async (token: string) => {
    const sheetRows = await readBillsFromSheet(token, activeTabRef.current);
    const sheetTotal = sheetRows.reduce((s, b) => s + b.total, 0);
    if (sheetRows.length > 0 && sheetTotal > 0) {
      lastPushedHashRef.current = billsHash(sheetRows);
      replaceBills(mergeSheetIntoBills(sheetRows, billsRef.current));
      return;
    }
    // Sheet tab is empty — push local bills
    await writeBillsToSheet(token, billsRef.current, activeTabRef.current, activeCatsRef.current);
    lastPushedHashRef.current = billsHash(billsRef.current);
  }, [replaceBills]);

  const pushToSheet = useCallback(async (token: string, billsToPush: Bill[]) => {
    setSyncStatus('syncing');
    try {
      await writeBillsToSheet(token, billsToPush, activeTabRef.current, activeCatsRef.current);
      lastPushedHashRef.current = billsHash(billsToPush);
      setLastSynced(new Date());
      setSyncStatus('idle');
      setSyncError(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleDisconnect('Сесијата истекла. Поврзете се повторно.');
      } else {
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : 'Sync failed');
      }
    }
  }, [handleDisconnect]);

  const pullRef = useRef(pullFromSheet);
  useEffect(() => { pullRef.current = pullFromSheet; }, [pullFromSheet]);

  const startPolling = useCallback((token: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        await pullRef.current(token);
        setLastSynced(new Date());
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          handleDisconnect('Сесијата истекла. Поврзете се повторно.');
        }
      }
    }, POLL_MS);
  }, [handleDisconnect]);

  // When the active house changes, clear tab cache and re-sync
  useEffect(() => {
    if (activeTab === activeTabRef.current) return;
    activeTabRef.current = activeTab;
    activeCatsRef.current = activeHouse.categories;
    resetTabCache();
    lastPushedHashRef.current = '';
    if (!tokenRef.current) return;
    setSyncStatus('syncing');
    initialSync(tokenRef.current)
      .then(() => { setLastSynced(new Date()); setSyncStatus('idle'); setSyncError(null); })
      .catch((err) => { handleDisconnect(err instanceof Error ? err.message : 'Sync failed'); });
  }, [activeTab, activeHouse.categories, initialSync, handleDisconnect]);

  // Push to sheet when bills change, debounced 2s
  useEffect(() => {
    if (!isConnected || !tokenRef.current) return;
    const currentHash = billsHash(bills);
    if (currentHash === lastPushedHashRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (tokenRef.current) pushToSheet(tokenRef.current, billsRef.current);
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [bills, isConnected, pushToSheet]);

  // Init GSI on mount
  useEffect(() => {
    if (!CLIENT_ID) return;
    loadGSI().then(() => {
      const g = (window as { google?: { accounts?: { oauth2?: { initTokenClient: (cfg: unknown) => { requestAccessToken: (o?: unknown) => void } } } } }).google;
      if (!g?.accounts?.oauth2) return;
      tokenClientRef.current = g.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (response: { access_token?: string; error?: string }) => {
          if (response.access_token) {
            tokenRef.current = response.access_token;
            setIsConnected(true);
            setSyncError(null);
            setSyncStatus('syncing');
            try {
              await initialSync(response.access_token);
              setLastSynced(new Date());
              setSyncStatus('idle');
              startPolling(response.access_token);
            } catch (err) {
              handleDisconnect(err instanceof Error ? err.message : 'Initial sync failed');
            }
          } else {
            setSyncError(response.error ?? 'Google auth failed');
          }
        },
      });
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [startPolling]);

  const connect = useCallback(() => {
    // prompt:'consent' forces Google to show the full permission screen every time,
    // which is required whenever a new scope (gmail.readonly) is being added.
    tokenClientRef.current?.requestAccessToken({ prompt: 'consent' });
  }, []);

  const disconnect = useCallback(() => handleDisconnect(), [handleDisconnect]);

  const syncNow = useCallback(async () => {
    if (!tokenRef.current) return;
    setSyncStatus('syncing');
    try {
      await pullRef.current(tokenRef.current);
      if (tokenRef.current) await pushToSheet(tokenRef.current, billsRef.current);
      setLastSynced(new Date());
      setSyncStatus('idle');
      setSyncError(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        handleDisconnect('Сесијата истекла. Поврзете се повторно.');
      } else {
        setSyncStatus('error');
        setSyncError(err instanceof Error ? err.message : 'Sync failed');
      }
    }
  }, [pushToSheet, handleDisconnect]);

  return (
    <GoogleSheetsContext.Provider value={{
      isConfigured: !!CLIENT_ID,
      isConnected,
      accessToken: tokenRef.current,
      syncStatus,
      lastSynced,
      syncError,
      connect,
      disconnect,
      syncNow,
    }}>
      {children}
    </GoogleSheetsContext.Provider>
  );
}
