import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, Bot, BarChart3,
  Settings, Bell, Moon, Sun, ChevronLeft, ChevronRight,
  Zap, RefreshCw, Globe, TrendingUp,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { syncData } from '@/services/api';
import { useState } from 'react';
import type { Market } from '@quant/shared';

const NAV_ITEMS = [
  { to: '/dashboard',              label: '儀表板', Icon: LayoutDashboard },
  { to: '/backtest/new',          label: '回測',    Icon: FlaskConical },
  { to: '/strategy',              label: '策略',    Icon: Bot },
  { to: '/analytics/market',      label: '分析',    Icon: BarChart3 },
  { to: '/analytics/tw-prediction', label: '台股預測', Icon: TrendingUp },
];

const MARKETS: { id: Market; label: string; flag: string }[] = [
  { id: 'tw', label: '台股', flag: '🇹🇼' },
  { id: 'us', label: '美股', flag: '🇺🇸' },
];

export default function AppLayout() {
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen, market, setMarket,
          syncStatus, unreadAlerts } = useAppStore();
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncData(market);
    } finally {
      setTimeout(() => setSyncing(false), 1500);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden"
         style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 shrink-0"
              style={{ height: 48, background: 'var(--color-sidebar)',
                       borderBottom: '1px solid var(--color-border)' }}>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <Zap size={18} color="#58a6ff" />
          <span className="font-bold text-sm">QuantTrader</span>
        </div>

        {/* Market switcher */}
        <div className="flex items-center gap-1 rounded-lg p-1"
             style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          {MARKETS.map((m) => (
            <button key={m.id} onClick={() => setMarket(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{
                      background: market === m.id ? '#58a6ff22' : 'transparent',
                      color: market === m.id ? '#58a6ff' : 'var(--color-text-2)',
                    }}>
              {m.flag} {m.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Sync button */}
          <button onClick={handleSync} disabled={syncing}
                  title="立即更新數據"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors"
                  style={{ color: syncing ? '#58a6ff' : 'var(--color-text-2)',
                           border: '1px solid var(--color-border)',
                           background: 'transparent', cursor: syncing ? 'wait' : 'pointer' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '更新中...' : '立即更新'}
          </button>

          {/* Last sync indicator */}
          {syncStatus[market].lastSync && (
            <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>
              更新: {new Date(syncStatus[market].lastSync).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <div style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }} />

          {/* Alerts */}
          <button onClick={() => navigate('/dashboard')}
                  className="relative p-1.5 rounded-md transition-colors"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer' }}>
            <Bell size={16} />
            {unreadAlerts > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center text-white text-xs font-bold rounded-full"
                    style={{ background: '#f85149', minWidth: 14, height: 14, fontSize: 9 }}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </button>

          {/* Theme */}
          <button onClick={toggleTheme}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer' }}>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Settings */}
          <button onClick={() => navigate('/settings')}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer' }}>
            <Settings size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────── */}
        <nav className="flex flex-col shrink-0 transition-all duration-200"
             style={{ width: sidebarOpen ? 180 : 56,
                      background: 'var(--color-sidebar)',
                      borderRight: '1px solid var(--color-border)' }}>
          <div className="flex-1 pt-2">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to}
                       className={({ isActive }) =>
                         `flex items-center gap-2.5 w-full transition-all border-l-2 ${
                           isActive ? 'border-[#58a6ff] text-[#58a6ff] font-semibold bg-[#58a6ff11]'
                                    : 'border-transparent text-[--color-text-2] hover:text-[--color-text] hover:bg-[--color-hover]'
                         }`}
                       style={{
                         padding: sidebarOpen ? '10px 16px' : '10px 0',
                         justifyContent: sidebarOpen ? 'flex-start' : 'center',
                         display: 'flex',
                       }}>
                <Icon size={18} />
                {sidebarOpen && <span className="text-sm">{label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Collapse toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex justify-center p-3"
                  style={{ background: 'transparent', border: 'none',
                           color: 'var(--color-text-2)', cursor: 'pointer',
                           borderTop: '1px solid var(--color-border)' }}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </nav>

        {/* ── Page content ──────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-5">
          <Outlet />
        </main>
      </div>

      {/* ── Status bar ───────────────────────────────────────── */}
      <footer className="flex items-center gap-4 px-4 shrink-0 text-xs"
              style={{ height: 24, background: 'var(--color-sidebar)',
                       borderTop: '1px solid var(--color-border)',
                       color: 'var(--color-text-2)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
          系統連線中
        </span>
        <span className="flex items-center gap-1.5">
          <Globe size={11} />
          {market === 'tw' ? '台股' : '美股'}
        </span>
        <span>
          數據更新週期: 每日一次 (24h)
        </span>
      </footer>
    </div>
  );
}
