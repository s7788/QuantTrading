import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Market } from '@quant/shared';

interface AppStore {
  // Market switcher
  market: Market;
  setMarket: (market: Market) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Data sync status
  syncStatus: Record<Market, { lastSync: string; status: 'idle' | 'syncing' | 'error' }>;
  setSyncStatus: (market: Market, status: AppStore['syncStatus'][Market]) => void;

  // Unread alerts count
  unreadAlerts: number;
  setUnreadAlerts: (n: number) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      market: 'tw',
      setMarket: (market) => set({ market }),

      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      syncStatus: {
        tw: { lastSync: '', status: 'idle' },
        us: { lastSync: '', status: 'idle' },
      },
      setSyncStatus: (market, status) =>
        set((s) => ({ syncStatus: { ...s.syncStatus, [market]: status } })),

      unreadAlerts: 0,
      setUnreadAlerts: (unreadAlerts) => set({ unreadAlerts }),
    }),
    { name: 'quant-app', partialize: (s) => ({ theme: s.theme, market: s.market, sidebarOpen: s.sidebarOpen }) }
  )
);
